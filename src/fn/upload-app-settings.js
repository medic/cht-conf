const api = require('../lib/api');
const fs = require('../lib/sync-fs');
const path = require('path');
const { info, error } = require('../lib/log');
const environment = require('../lib/environment');

module.exports = {
  requiresInstance: true,
  execute: () => {
    const settings = fs.read(path.join(environment.pathToProject, 'app_settings.json'));
    return api().updateAppSettings(settings)
      .then(JSON.parse)
      .then(response => {
        if (!response.success){
          // legacy support for older webapp versions which always return a 200
          // status even with an error
          throw new Error(response.error);
        }
        info(`app_settings uploaded successfully`);
      })
      .catch(e => {
        if (e.statusCode && e.statusCode === 400){
          error(JSON.parse(e.error));
          throw new Error('Check app_settings.json for invalid fields above');
        }
        throw e;
      });
  }
};
