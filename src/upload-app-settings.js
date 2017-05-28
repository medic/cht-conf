const fs = require('./sync-fs');
const request = require('request-promise-native');

module.exports = (project, couchUrl) => {
  return request.put({
    method: 'PUT',
    url: `${couchUrl}/_design/medic/_rewrite/update_settings/medic?replace=1`,
    headers: { 'Content-Type':'application/json' },
    body: fs.read(`${project}/app_settings.json`),
  });
};
