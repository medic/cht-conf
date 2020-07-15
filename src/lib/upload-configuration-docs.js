const attachmentsFromDir = require('../lib/attachments-from-dir');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const insertOrReplace = require('../lib/insert-or-replace');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');
const { info, warn } = require('../lib/log');

module.exports = async (configPath, directoryPath, dbDocName) => {
  if (!configPath && !directoryPath && !dbDocName) {
    warn('Information missing: Make sure to provide the configuration file path and the directory path.');
    return Promise.resolve();
  }

  const jsonPath = fs.path.resolve(configPath);

  if (!fs.exists(jsonPath)) {
    warn(`No configuration file found at path: ${jsonPath}`);
    return Promise.resolve();
  }

  const settings = fs.readJson(jsonPath);
  const baseDocument = {
    _id: dbDocName,
    _attachments: attachmentsFromDir(directoryPath),
  };
  const doc = Object.assign({}, baseDocument, settings);

  const db = pouch();

  const changes = await warnUploadOverwrite.preUploadDoc(db, doc);

  if (changes) {
    await insertOrReplace(db, doc);
    info('Configuration upload complete!');
  } else {
    info('Configuration not uploaded as no changes found');
  }

  warnUploadOverwrite.postUploadDoc(doc);

  return Promise.resolve();
};
