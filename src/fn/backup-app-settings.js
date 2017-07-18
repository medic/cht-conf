const fs = require('../lib/sync-fs');
const request = require('request-promise-native');

const log = require('../lib/log');
const backupFileFor = require('../lib/backup-file-for');

module.exports = (projectDir, couchUrl) => {
  const backupLocation = backupFileFor(projectDir, 'app_settings.json');

  return request({
      url: `${couchUrl}/_design/medic/_rewrite/app_settings/medic`,
      json: true,
    })
    .then(body => fs.writeJson(backupLocation, body.settings))
    .then(() => log('Backed up to:', backupLocation));
};
