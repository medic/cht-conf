const api = require('../lib/api');
const fs = require('../lib/sync-fs');
const skipFn = require('../lib/skip-fn');
const { info, error } = require('../lib/log');

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  const settings = fs.read(`${projectDir}/app_settings.json`);

  return api().updateAppSettings(settings)
    .then(res => {
      info(`app_settings uploaded successfully: ${res}`);
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
