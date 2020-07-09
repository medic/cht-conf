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
    const brandingPath = fs.path.resolve(`${environment.pathToProject}/branding.json`);

    if (!fs.exists(brandingPath)) {
      warn(`No branding file found at path: ${brandingPath}`);
      return Promise.resolve();
    }

    const brandingSettings = fs.readJson(brandingPath);

    const doc = {
      _id: 'branding',
      title: brandingSettings.title,
      resources: brandingSettings.resources,
      _attachments: attachmentsFromDir(`${environment.pathToProject}/branding`),
    };

    const db = pouch();

    const changes = await warnUploadOverwrite.preUploadDoc(db, doc);

    if (changes) {
      await insertOrReplace(db, doc);
      info('Branding file uploaded');
    } else {
      info('Branding file not uploaded as no changes found');
    }

    warnUploadOverwrite.postUploadDoc(doc);

    return Promise.resolve();
  }
};
