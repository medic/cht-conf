const api = require('../lib/api');
const fs = require('../lib/sync-fs');
const path = require('path');
const { info, error } = require('../lib/log');
const environment = require('../lib/environment');

module.exports = () => {
  const settings = fs.read(path.join(environment.pathToProject, 'app_settings.json'));
  return api().updateAppSettings(settings)
    .then(res => {
      info(`app_settings uploaded successfully: ${res}`);
    })
    .catch(e =>{
      if (e.statusCode && e.statusCode === 400){
        error(JSON.parse(e.error));
        throw new Error('Check app_settings.json for invalid fields above');
      } else {
        throw e;
      }
    });
};
