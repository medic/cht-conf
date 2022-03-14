const api = require('../lib/api');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { info } = require('../lib/log');
const APP_SETTINGS_DIR = 'app_settings';

function uploadAppSettings(api) {
  const settings = fs.read(`${environment.pathToProject}/app_settings.json`);
  return api.updateAppSettings(settings)
    .then(JSON.parse)
    .then(json => {
      // As per https://github.com/medic/cht-core/issues/3674, this endpoint
      // will return 200 even when upload fails.
      if (!json.success) {
        throw new Error(json.error);
      }

      if ('updated' in json) {
        // the `updated` param was added in 3.9
        // https://github.com/medic/cht-core/issues/6315
        if (!json.updated) {
          info('Settings not updated - no changes detected');
        } else {
          info('Settings updated successfully');
        }
      }
    });
}

module.exports = {
  uploadAppSettings,
  APP_SETTINGS_DIR,
  requiresInstance: true,
  execute: () => uploadAppSettings(api())
};
