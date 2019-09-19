const api = require('../lib/api');
const fs = require('../lib/sync-fs');

module.exports = (projectDir, apiUrl) => {
  const request = api(apiUrl);
  const settings = fs.read(`${projectDir}/app_settings.json`);
  return request.appSettings.update(settings)
    .then(JSON.parse)
    .then(json => {
      // As per https://github.com/medic/medic-webapp/issues/3674, this endpoint
      // will return 200 even when upload fails.
      if(!json.success) throw new Error(json.error);
    });
};
