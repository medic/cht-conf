const fs = require('../lib/sync-fs');
const google = require('googleapis');
const googleAuth = require('../lib/google-auth');
const info = require('../lib/log').info;

module.exports = projectDir => {
  return googleAuth()
    .then(auth => {
      const drive = google.drive({
        version: 'v3',
        auth: auth,
      });

      const forms = fs.readJson(`${projectDir}/forms-on-google-drive.json`);

      return Object.keys(forms)
        .reduce(fetchForm, Promise.resolve());

      function fetchForm(promiseChain, localName) {
        return promiseChain
          .then(() => new Promise((resolve, reject) => {
            const remoteName = forms[localName];

            const fetchOpts = {
              auth: auth,
              fileId: forms[localName],
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };

            const formDir = 'forms';
            fs.mkdir(formDir);
            const target = `${formDir}/${localName}`;

            info(`Exporting ${remoteName} from google drive to ${target}…`);

            var dest = fs.createWriteStream(target);
            
            drive.files.export(fetchOpts)
            .on('end', function() {
                info(`Successfully wrote ${target}.`);
                resolve();
            })
            .on('error', function(err) {
              reject(err);
            })
            .pipe(dest);
      
          }));
      }
    });
};
