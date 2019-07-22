const fs = require('../lib/sync-fs');
const request = require('request-promise-native');
const skipFn = require('../lib/skip-fn');
const { info, error } = require('../lib/log');

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  return request
    .put({
      method: 'PUT',
      url: `${couchUrl}/_design/medic/_rewrite/update_settings/medic?replace=1`,
      headers: { 'Content-Type':'application/json' },
      body: fs.read(`${projectDir}/app_settings.json`),
    })
    .then(res => {
      info('app_settings uploaded successfully');
    })
    .catch(e =>{
      if (e.statusCode && e.statusCode === 400){
        error('app_settings does not conform to schema');
        error(JSON.parse(e.error));
        throw new Error('app_settings upload failed');
      } else {
        throw e;
      }
    });
};
