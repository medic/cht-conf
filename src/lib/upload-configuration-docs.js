const attachmentsFromDir = require('../lib/attachments-from-dir');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const insertOrReplace = require('../lib/insert-or-replace');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');
const { info, warn } = require('../lib/log');

function filterAttachments(attachments, settings) {
  if (!attachments || !settings) {
    return;
  }

  const settingsStr = JSON.stringify(settings);

  return Object
    .entries(attachments)
    .reduce((accumulator, [key, value]) => {
      if (settingsStr.indexOf(key) > -1) {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});
}

const assertValidConfiguration = (validate, settings, attachments, dbDocName, jsonPath) => {
  if (!validate) {
    return;
  }
  const validation = validate(settings, attachments);
  if (!validation.valid) {
    throw new Error(`Invalid ${dbDocName} configuration in ${jsonPath}: ${validation.error}`);
  }
};

const uploadDoc = async (db, doc) => {
  const changes = await warnUploadOverwrite.preUploadDoc(db, doc);

  if (changes) {
    await insertOrReplace(db, doc);
    info('Configuration upload complete!');
  } else {
    info('Configuration not uploaded as no changes found');
  }

  await warnUploadOverwrite.postUploadDoc(db, doc);
};

/**
 * Upload Configuration to DB's document
 * @param configPath (Mandatory) String. Path to configuration json file.
 * @param directoryPath (Mandatory) String. Path to directory of attachments.
 * @param dbDocName (Mandatory) String. DB's document name.
 * @param options (Optional) Object.
 * @param options.processJson (Optional) Function. Receives the content of configuration json and
 *        returns an object that is used for extending the DB's document.
 * @param options.validate (Optional) Function. Receives the settings and the attachments and returns
 *        `{ valid: boolean, error?: string }`. When invalid, nothing is uploaded and an error is thrown.
 * @return {Promise<void>}
 */
async function uploadConfigurationDocs(configPath, directoryPath, dbDocName, options = {}) {
  const { processJson, validate } = options;

  if (!configPath && !directoryPath && !dbDocName) {
    warn('Information missing: Make sure to provide the configuration file path and the directory path.');
    return;
  }

  const jsonPath = fs.path.resolve(configPath);

  if (!fs.exists(jsonPath)) {
    warn(`No configuration file found at path: ${jsonPath}`);
    return;
  }

  const json = fs.readJson(jsonPath);
  const settings = processJson ? processJson(json) : json;
  const attachments = attachmentsFromDir(directoryPath);

  assertValidConfiguration(validate, settings, attachments, dbDocName, jsonPath);

  const baseDocument = {
    _id: dbDocName,
    _attachments: filterAttachments(attachments, settings)
  };
  const doc = Object.assign({}, baseDocument, settings);

  await uploadDoc(pouch(), doc);
}

module.exports = uploadConfigurationDocs;
