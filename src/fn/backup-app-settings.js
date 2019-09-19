const backupFileFor = require('../lib/backup-file-for');
const fs = require('../lib/sync-fs');
const log = require('../lib/log');

module.exports = (projectDir, db, api) => {
  const backupLocation = backupFileFor(projectDir, 'app_settings.json');

  return api.appSettings.get()
    .then(body => fs.writeJson(backupLocation, body.settings))
    .then(() => log('Backed up to:', backupLocation));
};
