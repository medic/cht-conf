const request = require('request-promise-native');

const archivingApi = require('./archiving-api');
const environment = require('./environment');
const log = require('../lib/log');

const logDeprecatedTransitions = (settings) => {
  const uri = `${environment.instanceUrl}/api/v1/settings/deprecated-transitions`;

  return request({ uri, method: 'GET', json: true})
    .then(transitions => {
      const appSettings = JSON.parse(settings);

      if (!appSettings.transitions) {
        return;
      }

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
    method: 'PUT',
    url: `${environment.apiUrl}/_design/medic/_rewrite/update_settings/medic?replace=1`,
    headers: {'Content-Type': 'application/json'},
    body: settings,
  });
};

const api = {
  getAppSettings: () => {
    const url = `${environment.apiUrl}/_design/medic/_rewrite/app_settings/medic`;
    return request({ url, json: true })
      .catch(err => {
        if(err.statusCode === 404) {
          throw new Error(`Failed to fetch existing app_settings from ${url}.\n` +
              `      Check that medic-api is running and that you're connecting on the correct port!`);
        } else {
          throw err;
        }
      });
  },

  updateAppSettings: (content) => {
    return Promise.allSettled([
      updateAppSettings(content),
      logDeprecatedTransitions(content)
    ]).then(([updateSettingsResp, logTransitionResp]) => {
      if (logTransitionResp.status === 'rejected') {
        // Log error and continue with the work, this isn't a blocking task.
        log.error('Error in logging deprecated transitions:', logTransitionResp.reason);
      }
      if (updateSettingsResp.status === 'rejected') {
        throw updateSettingsResp.reason;
      }
      return updateSettingsResp.value;
    });
  },

  createUser(userData) {
    return request({
      uri: `${environment.instanceUrl}/api/v1/users`,
      method: 'POST',
      json: true,
      body: userData,
    });
  },

  getUserInfo(queryParams) {
    return request.get(`${environment.instanceUrl}/api/v1/users-info`, { qs: queryParams, json: true });
  },

  uploadSms(messages) {
    return request({
      uri: `${environment.instanceUrl}/api/sms`,
      method: 'POST',
      json: true,
      body: { messages },
    });
  },

  version() {
    return request({ uri: `${environment.instanceUrl}/api/deploy-info`, method: 'GET', json: true }) // endpoint added in 3.5
      .then(deploy_info => deploy_info && deploy_info.version);
  },
};

Object.keys(api).forEach(key => {
  if (!archivingApi[key]) {
    archivingApi[key] = () => { throw Error('not supported in --archive mode'); };
  }
});

module.exports = () => environment.isArchiveMode ? archivingApi : api;
