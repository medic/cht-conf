const fs = require('./sync-fs');
const google = require('googleapis').google;
const googleAuth = require('./google-auth');
const info = require('./log').info;
const warn = require('./log').warn;

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY = 1000;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// List of valid MIME types: https://developers.google.com/drive/api/v3/manage-downloads#downloading_google_documents
module.exports = async (filesJson, targetDir, mimeType) => {
  return googleAuth()
    .then(auth => {
      const drive = google.drive({ auth, version:'v3' });

      const files = fs.readJson(filesJson);

      return Object.keys(files)
        .reduce(fetchFile, Promise.resolve())
        .then(() => new Promise(resolve => {
          // Here we pause to avoid a suspected race condition when trying to
          // access the last-written xlsx file.  Reported at
          // https://github.com/medic/cht-conf/issues/88
          setTimeout(resolve, 500);
        }));

      async function fetchFile(promiseChain, localName) {
        await promiseChain;

        const remoteName = files[localName];
        const fetchOpts = {
          auth,
          fileId: files[localName],
          mimeType,
        };

        const target = `${targetDir}/${localName}`;
        fs.mkdir(fs.path.dirname(target));

        for (let attempt = 1; ; attempt++) {
          info(`Exporting ${remoteName} from google drive to ${target}…`);
          try {
            await downloadFile(fetchOpts, target);
            info(`Successfully wrote ${target}.`);
            return;
          } catch (e) {
            // node-fetch throws "Premature close" when the response stream is
            // dropped mid-download; retry with backoff before giving up.
            if (attempt >= MAX_ATTEMPTS) {
              throw e;
            }
            warn(`Failed to export ${remoteName} (attempt ${attempt}/${MAX_ATTEMPTS}): ${e.message}. Retrying…`);
            await delay(RETRY_BASE_DELAY * attempt);
          }
        }
      }

      async function downloadFile(fetchOpts, target) {
        const res = await drive.files.export(fetchOpts, { responseType:'stream' });
        await new Promise((resolve, reject) => {
          const writeStream = fs.fs.createWriteStream(target);
          res.data.on('error', reject);
          writeStream.on('error', reject);
          writeStream.on('finish', resolve);
          res.data.pipe(writeStream);
        });
      }
    });
};
