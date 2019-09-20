const request = require('request-promise-native');

const archivingApi = require('./archiving-api');
const environment = require('./environment');
const instanceUrl = () => environment.apiUrl.replace(/\/medic$/, '');

const api = {
  get appSettings() {
    return {
      get: () => {
        const settingsUrl = `${environment.apiUrl}/_design/medic/_rewrite/app_settings/medic`;
        return request({ url: settingsUrl, json: true })
          .catch(err => {
            if(err.statusCode === 404) {
              throw new Error(`Failed to fetch existing app_settings from ${settingsUrl}.\n` +
                  `      Check that medic-api is running and that you're connecting on the correct port!`);
            } else {
              throw err;
            }
          });
      },

      update: (content) => {
        return request.put({
          method: 'PUT',
          url: `${environment.apiUrl}/_design/medic/_rewrite/update_settings/medic?replace=1`,
          headers: { 'Content-Type':'application/json' },
          body: content,
        });
      },
    };
  },

  createUser(userData) {
    return request({
      uri: `${instanceUrl()}/api/v1/users`,
      method: 'POST',
      json: true,
      body: userData,
    });
  },

  getUserInfo(queryString) {
    return request.get(`${instanceUrl()}/api/v1/users-info`, { qs: queryString, json: true });
  },

  uploadSms(messages) {
    return request({
      uri: `${instanceUrl()}/api/sms`,
      method: 'POST',
      json: true,
      body: { messages },
    });
  },

  version() {
    return request({ uri: `${instanceUrl()}/api/deploy-info`, method: 'GET', json: true }) // endpoint added in 3.5
      .then(deploy_info => deploy_info && deploy_info.version);
  },
};

module.exports = () => environment.isArchiveMode ? archivingApi : api;
