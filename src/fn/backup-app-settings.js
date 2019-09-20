const api = require('../lib/api');
const backupFileFor = require('../lib/backup-file-for');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const log = require('../lib/log');

module.exports = () => {
  const request = api(environment.apiUrl);
  const backupLocation = backupFileFor(environment.pathToProject, 'app_settings.json');

  return request.appSettings.get()
    .then(body => fs.writeJson(backupLocation, body.settings))
    .then(() => log('Backed up to:', backupLocation));
};
