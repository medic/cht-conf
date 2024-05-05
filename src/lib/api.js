const retry = require('async-retry');
const rpn = require('request-promise-native');

const archivingApi = require('./archiving-api');
const environment = require('./environment');
const log = require('./log');
const url = require('url');
const nools = require('./nools-utils');

const cache = new Map();

// Helper function to create request headers with session token (if available)
const withCookieSession = (...args) => {
  const options = typeof args[0] === 'object' ? Object.assign({}, args[0]) : { url: args[0] };

  if (args.length > 1) {
    // Merge remaining arguments
    Object.assign(options, ...args.slice(1));
  }

  const sessionTokenHeader = nools.sessionTokenHeader(environment);
  if (sessionTokenHeader || options.headers) {
    options.headers = Object.assign({}, options.headers || {}, sessionTokenHeader);
  }

  return options;
};

const _request = (method) => (...args) => {
  const requestOptions = withCookieSession(...args);
  return retry(() => rpn[method](requestOptions), { retries: 5, randomize: false, factor: 1.5 });
};

const request = {
  get: _request('get'),
  post: _request('post'),
  put: _request('put'),
};

const logDeprecatedTransitions = (settings) => {
  const appSettings = JSON.parse(settings);

  if (!appSettings.transitions || !Object.keys(appSettings.transitions).length) {
    return Promise.resolve();
  }

  const uri = `${environment.instanceUrl}/api/v1/settings/deprecated-transitions`;
  return request.get({ uri, json: true })
    .then(transitions => {
      (transitions || []).forEach(transition => {
        const transitionSetting = appSettings.transitions[transition.name];
        const disabled = transitionSetting && transitionSetting.disable;

        if (transitionSetting && !disabled) {
          log.warn(transition.deprecationMessage);
        }
      });
    })
    .catch(error => {
      if (error.statusCode !== 404) {
        throw error;
      }
    });
};

const updateAppSettings = (settings) => {
  return request.put({
    url: `${environment.apiUrl}/_design/medic/_rewrite/update_settings/medic?replace=1`,
    headers: { 'Content-Type': 'application/json' },
    body: settings,
  });
};

const api = {
  getAppSettings: () => {
    const url = `${environment.apiUrl}/_design/medic/_rewrite/app_settings/medic`;
    return request.get({ url, json: true })
      .catch(err => {
        if (err.statusCode === 404) {
          throw new Error(`Failed to fetch existing app_settings from ${url}.\n` +
            `      Check that CHT API is running and that you're connecting on the correct port!`);
        } else {
          throw err;
        }
      });
  },

  updateAppSettings: (content) => {
    return logDeprecatedTransitions(content)
      .catch(err => {
        // Log error and continue with the work, this isn't a blocking task.
        log.warn('Failed to check for deprecated transitions. Continuing...', err);
      })
      .then(() => updateAppSettings(content));
  },

  createUser(userData) {
    return request.post({
      uri: `${environment.instanceUrl}/api/v1/users`,
      json: true,
      body: userData,
    });
  },

  getUserInfo(queryParams) {
    return request.get(`${environment.instanceUrl}/api/v1/users-info`, { qs: queryParams, json: true });
  },

  uploadSms(messages) {
    return request.post({
      uri: `${environment.instanceUrl}/api/sms`,
      json: true,
      body: { messages },
    });
  },

  /**
   * Check whether the API is alive or not. The request
   * is made to a "lightweight" endpoint that only returns a HTTP 302,
   * and an promise is returned with true (available) or false.
   */
  available: async () => {
    const url = `${environment.apiUrl}/`;
    log.info(`Checking that ${url} is available...`);
    try {
      await request.get(url);
    } catch (err) {
      if (err.statusCode === 401) {
        throw new Error(`Authentication failed connecting to ${url}. `
          + 'Check the supplied username and password and try again.');
      }
      if (err.statusCode === 403) {
        throw new Error(`Insufficient permissions connecting to ${url}. `
          + 'You need to use admin permissions to execute this command.');
      }
      if (err.statusCode) {
        throw new Error(`Received error code ${err.statusCode} connecting to ${url}. `
          + 'Check the server and and try again.');
      }
      throw new Error(`Failed to get a response from ${url}. Maybe you entered the wrong URL, `
        + 'wrong port or the instance is not started. Please check and try again.');
    }
  },

  version() {
    return request.get({ uri: `${environment.instanceUrl}/api/deploy-info`, json: true }) // endpoint added in 3.5
      .then(deploy_info => deploy_info && deploy_info.version);
  },

  /**
   * Whether form validation endpoint exists or not, by
   * default we assume it exists, but once `formsValidate`
   * is called if the response is a 404 error, the
   * value is changed to `false`, so next call to
   * the function the request is omitted and the
   * form considered valid
   */
  _formsValidateEndpointFound: true,

  /**
   * Validates an XForm against the API.
   * @param formXml XML string
   * @returns a JSON object if the validation is successful,
   *          typically `{ok: true}`. If the validation endpoint
   *          does not exist, the form is considered valid
   *          and `{ok: true, formsValidateEndpointFound: false}`
   *          is returned.
   *          If the method is called again after the endpoint
   *          was not found, `{ok: true, formsValidateEndpointFound: false}`
   *          will be returned again without calling the API
   * @throws `Error` exception with the validations error message
   *         from the API
   */
  formsValidate(formXml) {
    if (!this._formsValidateEndpointFound) {
      // The endpoint to validate forms doesn't exist in the API,
      // (old version), so we assume form is valid but return special result
      return Promise.resolve({ ok: true, formsValidateEndpointFound: false });
    }
    return request.post({
      uri: `${environment.instanceUrl}/api/v1/forms/validate`,
      headers: { 'Content-Type': 'application/xml' },
      body: formXml,
    })
      .then(resp => {
        try {
          return JSON.parse(resp);
        } catch (e) {
          throw new Error('Invalid JSON response validating XForm against the API: ' + resp);
        }
      })
      .catch(err => {
        if (err.statusCode === 404) {
          // The endpoint doesn't exist in the API (old CHT version), so
          // we assume the form is valid but return special JSON
          // highlighting the situation, and remembering the lack
          // of the endpoint so next call there is no need
          // to call the missed endpoint again
          this._formsValidateEndpointFound = false;
          return { ok: true, formsValidateEndpointFound: false };
        }
        if (err.statusCode === 400 && err.error) {
          throw new Error(JSON.parse(err.error).error);
        }
        throw err;
      });
  },

  async getCompressibleTypes() {
    const parsedUrl = new url.URL(environment.apiUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.username}:${parsedUrl.password}@${parsedUrl.host}`;
    const configUrl = `${baseUrl}/api/couch-config-attachments`;
    try {
      if (cache.has('compressibleTypes')) {
        return cache.get('compressibleTypes');
      }
      const resp = await request.get({ url: configUrl, json: true });
      const compressibleTypes = resp.compressible_types.split(',').map(s => s.trim());
      cache.set('compressibleTypes', compressibleTypes);
      return compressibleTypes;
    } catch (e) {
      if (e.statusCode === 404) {
        cache.set('compressibleTypes', []);
      } else {
        log.error(`Error trying to get couchdb config: ${e}`);
      }
      return [];
    }
  }
};

Object.entries(api)
  .filter(([key, value]) => typeof value === 'function' && !archivingApi[key])
  .forEach(([key,]) => {
    archivingApi[key] = () => {
      // if this error is raised, somebody forgot to add a mock
      // implementation to ./archiving-api.js or the action isn't
      // implemented right when archive mode is running :-(
      throw Error(`${key} not supported in --archive mode`);
    };
  });

module.exports = () => environment.isArchiveMode ? archivingApi : api;
