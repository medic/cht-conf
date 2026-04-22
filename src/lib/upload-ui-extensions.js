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
  type: Joi.string().valid('app_main_tab', 'app_drawer_tab').required(),
  title: Joi.string().required(),
  icon: Joi.string().required(),
  roles: Joi.array().items(Joi.string()),
  config: Joi.object().unknown(true)
});

//validates the name against custom web component standards
const validateExtensionName = (name) => {
  const startsWithLowercase = /^[a-z]/.test(name);
  const hasHyphen = name.includes('-');
  const hasValidChars = /^[a-z0-9_.-]+$/.test(name);

  return startsWithLowercase && hasHyphen && hasValidChars;
};

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
  if (!validateExtensionName(name)) {
    throw new Error(
      `UI Extension name "${name}" is invalid. It must start with a lowercase letter, ` +
      'contain at least one hyphen, and use only lowercase letters, digits, hyphens, ' +
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
    _id: `ui-extension:${name}`,
    type: 'ui-extension',
    ...propsContent,
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

module.exports = { uploadUiExtensions };
