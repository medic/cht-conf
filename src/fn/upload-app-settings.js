const api = require('../lib/api');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');

module.exports = () => {
  const settings = fs.read(`${environment.pathToProject}/app_settings.json`);
  return api().updateAppSettings(settings)
    .then(JSON.parse)
    .then(json => {
      // As per https://github.com/medic/medic-webapp/issues/3674, this endpoint
      // will return 200 even when upload fails.
      if(!json.success) throw new Error(json.error);
    });
};
