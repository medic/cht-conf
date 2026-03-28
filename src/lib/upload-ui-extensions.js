const fs = require('fs');
const path = require('path');
const Joi = require('joi');
const environment = require('./environment');
const log = require('./log');
const insertOrReplace = require('./insert-or-replace');
const warnUploadOverwrite = require('./warn-upload-overwrite');
const pouch = require('./db');

const schema = Joi.object({
  type: Joi.string().valid('app_main_tab', 'app_drawer_tab').required(),
  title: Joi.string().required(),
  icon: Joi.string().required(),
  roles: Joi.array().items(Joi.string()),
  config: Joi.object().unknown(true)
});

module.exports = async (uiExtensionsDir, specificExtensions = []) => {
  if (!fs.existsSync(uiExtensionsDir)) {
    log.info(`No directory found at "${uiExtensionsDir}" - not uploading ui-extensions`);
    return;
  }

  const allFiles = fs.readdirSync(uiExtensionsDir);

  // Extract unique extension names from either .js or .properties.json files
  const extensionNames = new Set(
    allFiles
      .filter(f => f.endsWith('.js') || f.endsWith('.properties.json'))
      .map(f => f.replace(/\.properties\.json$|\.js$/, ''))
  );

  let namesToUpload = Array.from(extensionNames);
  if (specificExtensions && specificExtensions.length > 0) {
    namesToUpload = namesToUpload.filter(name => specificExtensions.includes(name));
  }

  if (namesToUpload.length === 0) {
    log.info('No UI extensions to upload.');
    return;
  }

  log.info(`Found UI extensions: ${namesToUpload.join(', ')}`);

  let db;

  for (const name of namesToUpload) {
    const jsPath = path.join(uiExtensionsDir, `${name}.js`);
    const propsPath = path.join(uiExtensionsDir, `${name}.properties.json`);

    if (!fs.existsSync(jsPath) || !fs.existsSync(propsPath)) {
      throw new Error(`UI Extension "${name}" is missing either its .js or .properties.json file.`);
    }

    const propsContent = JSON.parse(fs.readFileSync(propsPath, 'utf-8'));
    const validation = schema.validate(propsContent);

    if (validation.error) {
      throw new Error(`Validation error for UI extension "${name}": ${validation.error.message}`);
    }

    const jsContent = fs.readFileSync(jsPath);

    const doc = {
      _id: `ui-extension:${name}`,
      type: 'ui-extension',
      ...propsContent,
      _attachments: {
        'extension.js': {
          content_type: 'application/javascript',
          data: jsContent
        }
      }
    };

    if (!db) {
      db = pouch(environment.apiUrl);
    }

    const changes = await warnUploadOverwrite.preUploadDoc(db, doc);
    if (!changes) {
      log.info(`UI Extension "${name}" not uploaded as already up to date`);
      continue;
    }

    await insertOrReplace(db, doc);
    log.info(`UI Extension "${name}" upload complete`);
    await warnUploadOverwrite.postUploadDoc(db, doc);
  }
};
