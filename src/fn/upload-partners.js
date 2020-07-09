const attachmentsFromDir = require('../lib/attachments-from-dir');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const insertOrReplace = require('../lib/insert-or-replace');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');
const { info, warn } = require('../lib/log');

module.exports = {
  requiresInstance: true,
  execute: async () => {
    const partnersPath = fs.path.resolve(`${environment.pathToProject}/partners.json`);

    if (!fs.exists(partnersPath)) {
      warn(`No partners file found at path: ${partnersPath}`);
      return Promise.resolve();
    }

    const partnersSettings = fs.readJson(partnersPath);

    const doc = {
      _id: 'partners',
      resources: partnersSettings.resources,
      _attachments: attachmentsFromDir(`${environment.pathToProject}/partners`),
    };

    const db = pouch();

    const changes = await warnUploadOverwrite.preUploadDoc(db, doc);

    if (changes) {
      await insertOrReplace(db, doc);
      info('Partners file uploaded');
    } else {
      info('Partners file not uploaded as no changes found');
    }

    warnUploadOverwrite.postUploadDoc(doc);

    return Promise.resolve();
  }
};
