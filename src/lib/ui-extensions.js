const fs = require('node:fs');
const path = require('node:path');
const Joi = require('joi');
const environment = require('./environment');
const log = require('./log');
const insertOrReplace = require('./insert-or-replace');
const warnUploadOverwrite = require('./warn-upload-overwrite');
const pouch = require('./db');
const attachmentFromFile = require('./attachment-from-file');

const schema = Joi.object({
  extension_type: Joi.string().valid('header_tab', 'sidebar_tab').required(),
  title: Joi.string().required(),
  icon: Joi.string().pattern(/^fa-/).optional(),
  resource_icon: Joi.string().optional(),
  roles: Joi.array().items(Joi.string()),
  accent_color: Joi.string().optional(),
  weight: Joi.number().optional(),
  config: Joi.object().unknown(true)
}).oxor('icon', 'resource_icon');

// Name will be used in Couch _id and in web component name.
const isValidExtensionName = (name) => /^[a-zA-Z0-9_.-]+$/.test(name);

const getNamesToUpload = (uiExtensionsDir) => {
  const allFiles = fs.readdirSync(uiExtensionsDir);
  const extensionNames = new Set(
    allFiles
      .filter(f => f.endsWith('.js') || f.endsWith('.properties.json'))
      .map(f => f.replace(/(\.properties\.json|\.js)$/, ''))
  );

  return Array.from(extensionNames);
};

const readPropertiesFile = (propsPath) => {
  try {
    const rawProps = fs.readFileSync(propsPath, 'utf-8');
    return JSON.parse(rawProps);
  } catch (err) {
    throw new Error(
      `Failed to parse ${propsPath.split('/').at(-1)} - Invalid JSON format: ${err.message}`
    );
  }
};

const getExtensionDoc = (uiExtensionsDir, name) => {
  if (!isValidExtensionName(name)) {
    throw new Error(
      `UI Extension name "${name}" is invalid. It must contain only letters, digits, hyphens, ` +
      'periods, or underscores.'
    );
  }

  const jsPath = path.join(uiExtensionsDir, `${name}.js`);
  const propsPath = path.join(uiExtensionsDir, `${name}.properties.json`);

  if (!fs.existsSync(jsPath) || !fs.existsSync(propsPath)) {
    throw new Error(`UI Extension "${name}" is missing either its .js or .properties.json file.`);
  }

  const propsContent = readPropertiesFile(propsPath);

  const validation = schema.validate(propsContent);
  if (validation.error) {
    throw new Error(`Validation error for UI extension "${name}": ${validation.error.message}`);
  }

  return {
    ...propsContent,
    _id: `ui-extension:${name}`,
    type: 'ui-extension',
    _attachments: {
      'extension.js': attachmentFromFile(jsPath)
    }
  };
};

const uploadDocToDb = async (db, doc, name) => {
  const changes = await warnUploadOverwrite.preUploadDoc(db, doc);
  if (!changes) {
    log.info(`UI Extension "${name}" not uploaded as already up to date`);
    return;
  }

  await insertOrReplace(db, doc);
  log.info(`UI Extension "${name}" upload complete`);
  await warnUploadOverwrite.postUploadDoc(db, doc);
};

const uploadUiExtensions = async (uiExtensionsDir, specificExtensions = []) => {
  if (!fs.existsSync(uiExtensionsDir)) {
    log.info(`No directory found at "${uiExtensionsDir}" - not uploading ui-extensions`);
    return;
  }

  // if specific extensions are provided, bypass directory reading
  // missing files will be caught by getExtensionDoc
  const namesToUpload = specificExtensions.length ? specificExtensions : getNamesToUpload(uiExtensionsDir);

  if (!namesToUpload.length) {
    log.info('No UI extensions to upload.');
    return;
  }

  log.info(`Found UI extensions: ${namesToUpload.join(', ')}`);

  // process all docs before uploading any to ensure validation passes for everything
  const namesWithDocs = namesToUpload.map(name => [name, getExtensionDoc(uiExtensionsDir, name)]);

  const db = pouch(environment.apiUrl);

  for (const [name, doc] of namesWithDocs) {
    await uploadDocToDb(db, doc, name);
  }
};

const getDocsToDelete = async (db, specifiedExtensions) => {
  const keys = specifiedExtensions.map(name => `ui-extension:${name}`);
  const opts = keys.length ? { keys }: {
    startkey: 'ui-extension:',
    endkey: 'ui-extension:\ufff0'
  };
  const result = await db.allDocs({
    ...opts,
    include_docs: true
  });
  const docs = result.rows.map(row => row.doc);
  keys
    .filter(key => !docs.some(({ _id }) => _id === key))
    .forEach(name => log.warn(`UI Extension "${name.slice(13)}" not found in database. Skipping.`));
  return result.rows.map(row => row.doc);
};

const deleteUiExtensions = async (specifiedExtensions = []) => {
  const db = pouch(environment.apiUrl);

  const docs = await getDocsToDelete(db, specifiedExtensions);

  if (!docs.length) {
    log.info('No UI extensions found to delete.');
    return;
  }

  log.info(`Deleting ${docs.length} UI extension(s)...`);

  for (const doc of docs) {
    try {
      await db.remove(doc);
      log.info(`Deleted UI Extension: ${doc._id.replace('ui-extension:', '')}`);
    } catch (err) {
      throw new Error(`Failed to delete ${doc._id}: ${err.message}`);
    }
  }
};

module.exports = {
  uploadUiExtensions,
  deleteUiExtensions
};
