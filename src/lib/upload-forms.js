const argsFormFilter = require('./args-form-filter');
const attachmentsFromDir = require('./attachments-from-dir');
const attachmentFromFile = require('./attachment-from-file');
const crypto = require('crypto');
const fs = require('./sync-fs');
const log = require('./log');
const insertOrReplace = require('./insert-or-replace');
const pouch = require('./db');
const warnUploadOverwrite = require('./warn-upload-overwrite');
const {
  getFormDir,
  getFormFilePaths,
  readTitleFrom,
} = require('./forms-utils');

const SUPPORTED_PROPERTIES = ['context', 'icon', 'title', 'xml2sms', 'subject_key', 'hidden_fields'];
const CONTACT_DUPLICATE_CHECK_PROPERTY = 'duplicate_check';
const FORM_EXTENSTION = '.xml';
const FORM_PROPERTIES_EXTENSION = '.properties.json';
const FORM_MEDIA_MATCHER = /(.+)-media$/;
const SUPPORTED_EXTENSIONS = [FORM_EXTENSTION, FORM_PROPERTIES_EXTENSION];

const formFileMatcher = (fileName) => {
  if (fileName.endsWith(FORM_EXTENSTION)) {
    return fileName.slice(0, fileName.length - FORM_EXTENSTION.length);
  }
  if (fileName.endsWith(FORM_PROPERTIES_EXTENSION)) {
    return fileName.slice(0, fileName.length - FORM_PROPERTIES_EXTENSION.length);
  }
  return null;
};

const formMediaMatcher = (formMediaDir) => {
  const matchResult = formMediaDir.match(FORM_MEDIA_MATCHER);
  if (matchResult) {
    return matchResult[1]; // return the captured form name
  }
  return null;
};

const execute = async (projectDir, subDirectory, options) => {
  const db = pouch();
  if (!options) {
    options = {};
  }
  const formsDir = getFormDir(projectDir, subDirectory);
  if (!fs.exists(formsDir)) {
    log.info(`Forms dir not found: ${formsDir}`);
    return;
  }

  const PROPERTIES = [...SUPPORTED_PROPERTIES];
  if (subDirectory === 'contact') {
    PROPERTIES.push(CONTACT_DUPLICATE_CHECK_PROPERTY);
  }

  const fileNames = argsFormFilter(formsDir, FORM_EXTENSTION, options);
  for (const fileName of fileNames) {
    log.info(`Preparing form for upload: ${fileName}…`);

    const { baseFileName, mediaDir, xformPath, filePath } = getFormFilePaths(formsDir, fileName);
    const internalId = (options.id_prefix || '') + baseFileName.replaceAll('-', ':');

    const mediaDirExists = fs.exists(mediaDir);
    if (!mediaDirExists) {
      log.info(`No media directory found at ${mediaDir} for form ${xformPath}`);
    }

    const hashSum = crypto.createHash('sha256');
    const xml = fs.read(xformPath);
    hashSum.update(xml);
    const xmlVersion = {
      time: Date.now(),
      sha256: hashSum.digest('hex'),
    };

    const docId = `form:${internalId}`;
    const doc = {
      _id: docId,
      type: 'form',
      internalId: internalId,
      xmlVersion: xmlVersion,
      title: readTitleFrom(xml),
      context: options.default_context,
    };

    const propertiesPath = `${formsDir}/${baseFileName}${FORM_PROPERTIES_EXTENSION}`;
    updateFromPropertiesFile(baseFileName, doc, propertiesPath, PROPERTIES);

    doc._attachments = mediaDirExists ? attachmentsFromDir(mediaDir) : {};
    doc._attachments.xml = attachmentFromFile(xformPath);

    const properties = PROPERTIES.concat('internalId');

    const changes = await warnUploadOverwrite.preUploadForm(db, doc, xml, properties);
    if (changes) {
      await insertOrReplace(db, doc);
      log.info(`Form ${filePath} uploaded`);
    } else {
      log.info(`Form ${filePath} not uploaded, no changes`);
    }
    // update hash regardless
    await warnUploadOverwrite.postUploadForm(doc, xml, properties);
  }
};

module.exports = {
  SUPPORTED_EXTENSIONS,
  FORM_MEDIA_MATCHER,
  formFileMatcher,
  formMediaMatcher,
  execute
};

const updateFromPropertiesFile = (baseFileName, doc, path, supported_properties) => {
  if (fs.exists(path)) {

    const ignoredKeys = [];
    const properties = fs.readJson(path);

    Object
      .keys(properties)
      .forEach(key => {
        if (typeof properties[key] === 'undefined') {
          return;
        }
        if (supported_properties.includes(key)) {
          doc[key] = properties[key];
          return;
        }
        if (key === 'internalId') {
          log.warn(`DEPRECATED: ${path}. Please do not manually set internalId in .properties.json for new projects. Support for configuring this value will be dropped. Please see https://github.com/medic/cht-core/issues/3342.`);
          if (doc.internalId === properties.internalId) {
            return;
          }
          throw new Error(`The file name for the form [${
            baseFileName
          }] does not match the internalId in the ${baseFileName}.properties.json [${
            properties.internalId
          }]. Rename the form xlsx/xml files to match the internalId.`);
        }

        ignoredKeys.push(key);
      });

    if (ignoredKeys.length) {
      log.warn(`Ignoring unknown properties in ${path}: ${ignoredKeys.join(', ')}`);
    }
  }
};
