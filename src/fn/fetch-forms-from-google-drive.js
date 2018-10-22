const fs = require('../lib/sync-fs');
const google = require('googleapis').google;
const googleAuth = require('../lib/google-auth');
const info = require('../lib/log').info;

module.exports = projectDir => {
  return googleAuth()
    .then(auth => {
      const drive = google.drive({ auth, version:'v3' });

      const forms = fs.readJson(`${projectDir}/forms-on-google-drive.json`);

      return Object.keys(forms)
        .reduce(fetchForm, Promise.resolve());

      function fetchForm(promiseChain, localName) {
        return promiseChain
          .then(() => new Promise((resolve, reject) => {
            const remoteName = forms[localName];

            const fetchOpts = {
              auth,
              fileId: forms[localName],
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };

            const formDir = 'forms';
            fs.mkdir(formDir);
            const target = `${formDir}/${localName}`;

            info(`Exporting ${remoteName} from google drive to ${target}…`);

            drive.files.export(fetchOpts, { responseType:'stream' })
              .then(res => {
                res.data
                  .on('end', () => {
                    info(`Successfully wrote ${target}.`);
                    resolve();
                  })
                  .on('error', reject)
                  .pipe(fs.fs.createWriteStream(target));
              })
              .catch(reject);
          }));
      }
    });
};
