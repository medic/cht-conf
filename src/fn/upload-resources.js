const attachmentsFromDir = require('../lib/attachments-from-dir');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const { info, warn } = require('../lib/log');
const insertOrReplace = require('../lib/insert-or-replace');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');

module.exports = {
  requiresInstance: true,
  execute: async () => {
    const resourcesPath = fs.path.resolve(`${environment.pathToProject}/resources.json`);

    if(!fs.exists(resourcesPath)) {
      warn(`No resources file found at path: ${resourcesPath}`);
      return Promise.resolve();
    }

    const doc = {
      _id: 'resources',
      resources: fs.readJson(resourcesPath),
      _attachments: attachmentsFromDir(`${environment.pathToProject}/resources`),
    };

    const db = pouch();

    const changes = await warnUploadOverwrite.preUploadDoc(db, doc);
    if (changes) {
      await insertOrReplace(db, doc);
      info('Resources file uploaded');
    } else {
      info('Resources file not uploaded as no changes found');
    }

    warnUploadOverwrite.postUploadDoc(doc);

    return Promise.resolve();
  }
};
