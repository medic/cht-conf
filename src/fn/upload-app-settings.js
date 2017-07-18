const fs = require('../lib/sync-fs');
const request = require('request-promise-native');

module.exports = (projectDir, couchUrl) => {
  return request
    .put({
      method: 'PUT',
      url: `${couchUrl}/_design/medic/_rewrite/update_settings/medic?replace=1`,
      headers: { 'Content-Type':'application/json' },
      body: fs.read(`${projectDir}/app_settings.json`),
    })
    .then(JSON.parse)
    .then(json => {
      // As per https://github.com/medic/medic-webapp/issues/3674, this endpoint
      // will return 200 even when upload fails.
      if(!json.success) throw new Error(json.error);
    });
};
