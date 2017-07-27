const backupFileFor = require('../lib/backup-file-for');
const fs = require('../lib/sync-fs');
const log = require('../lib/log');
const request = require('request-promise-native');
const skipFn = require('../lib/skip-fn');

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  const backupLocation = backupFileFor(projectDir, 'app_settings.json');

  return request({
      url: `${couchUrl}/_design/medic/_rewrite/app_settings/medic`,
      json: true,
    })
    .then(body => fs.writeJson(backupLocation, body.settings))
    .then(() => log('Backed up to:', backupLocation));
};
