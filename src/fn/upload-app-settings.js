const fs = require('../lib/sync-fs');

module.exports = (projectDir, db, api) => {
  const settings = fs.read(`${projectDir}/app_settings.json`);
  return api.appSettings.update(settings)
    .then(JSON.parse)
    .then(json => {
      // As per https://github.com/medic/medic-webapp/issues/3674, this endpoint
      // will return 200 even when upload fails.
      if(!json.success) throw new Error(json.error);
    });
};
