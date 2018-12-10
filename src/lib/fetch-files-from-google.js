const fs = require('./sync-fs');
const google = require('googleapis').google;
const googleAuth = require('./google-auth');
const info = require('./log').info;
const path = require('path');

module.exports = (projectDir,googleDocsJsonFileName, docType) => {
  return googleAuth()
    .then(auth => {
      const drive = google.drive({ auth, version:'v3' });

      const forms = fs.readJson(`${projectDir}/${googleDocsJsonFileName}`);

      return Object.keys(forms)
        .reduce(fetchForm, Promise.resolve())
        .then(() => new Promise(resolve => {
          // Here we pause to avoid a suspected race condition when trying to
          // access the last-written xlsx file.  Reported at
          // https://github.com/medic/medic-conf/issues/88
          setTimeout(resolve, 500);
        }));

      function fetchForm(promiseChain, localName) {
        return promiseChain
          .then(() => new Promise((resolve, reject) => {
            const remoteName = forms[localName];

            //List of valid mimeTypes
            //https://developers.google.com/drive/api/v3/manage-downloads#downloading_google_documents
            const mimeTypes = {
              'forms':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'csv':'text/csv'
            };
            const fetchOpts = {
              auth,
              fileId: forms[localName],
              mimeType: mimeTypes[docType],
            };
            const target = `${docType}/${localName}`;
            const destPath = path.dirname(target);
            fs.mkdir(destPath);

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
