const backupFileFor = require('../lib/backup-file-for');
const fs = require('../lib/sync-fs');
const log = require('../lib/log');
const request = require('request-promise-native');
const skipFn = require('../lib/skip-fn');

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  const backupLocation = backupFileFor(projectDir, 'app_settings.json');

  const settingsUrl = `${couchUrl}/_design/medic/_rewrite/app_settings/medic`;

  return request({ url:settingsUrl, json:true })
    .catch(err => {
      if(err.statusCode === 404) {
        throw new Error(`Failed to fetch existing app_settings from ${settingsUrl}.\n` +
            `      Check that medic-api is running and that you're connecting on the correct port!`);
      } else throw err;
    })
    .then(body => fs.writeJson(backupLocation, body.settings))
    .then(() => log('Backed up to:', backupLocation));
};
