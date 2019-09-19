const request = require('request-promise-native');

class API {
  constructor(data) {
    this.couchUrl = data;
  }

  get appSettings() {
    return {
      get: () => {
        const settingsUrl = `${this.couchUrl}/_design/medic/_rewrite/app_settings/medic`;
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
          url: `${this.couchUrl}/_design/medic/_rewrite/update_settings/medic?replace=1`,
          headers: { 'Content-Type':'application/json' },
          body: content,
        });
      },
    };
  }

  createUser(userData) {
    const instanceUrl = this.couchUrl.replace(/\/medic$/, '');

    return request({
      uri: `${instanceUrl}/api/v1/users`,
      method: 'POST',
      json: true,
      body: userData,
    });
  }

  get description() {
    return this.couchUrl;
  }

  getUserInfo(queryString) {
    const instanceUrl = this.couchUrl.replace(/\/medic$/, '');
    return request.get(`${instanceUrl}/api/v1/users-info`, { qs: queryString, json: true });
  }

  uploadSms(messages) {
    const instanceUrl = this.couchUrl.replace(/\/medic$/, '');
    return request({
      uri: `${instanceUrl}/api/sms`,
      method: 'POST',
      json: true,
      body: { messages },
    });
  }

  version() {
    const instanceUrl = this.couchUrl.replace(/\/medic$/, '');
    return request({ uri: `${instanceUrl}/api/deploy-info`, method: 'GET', json: true }) // endpoint added in 3.5
      .then(deploy_info => deploy_info && deploy_info.version);
  }
}

module.exports = url => new API(url);
