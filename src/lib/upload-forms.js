const failPromiseChain = require('./fail-promise-chain');
const api = require('./api')();
const argsFormFilter = require('./args-form-filter');
const attachmentsFromDir = require('./attachments-from-dir');
const attachmentFromFile = require('./attachment-from-file');
const fs = require('./sync-fs');
const log = require('./log');
const insertOrReplace = require('./insert-or-replace');
const pouch = require('./db');
const warnUploadOverwrite = require('./warn-upload-overwrite');

const SUPPORTED_PROPERTIES = ['context', 'icon', 'title', 'xml2sms', 'subject_key', 'hidden_fields'];

module.exports = (projectDir, subDirectory, options) => {
  const db = pouch();
  if (!options) options = {};

  const formsDir = `${projectDir}/forms/${subDirectory}`;
  if(!fs.exists(formsDir)) {
    log.warn(`Forms dir not found: ${formsDir}`);
    // result: 'skip' is returned when this is executed
    // in the validation phase so execution phase is skipped
    return Promise.resolve({result: 'skip'});
  }

  return argsFormFilter(formsDir, '.xml', options)
    .reduce((promiseChain, fileName) => {
      log.info(`Preparing form for ${options.validate ? 'validate' : 'upload'}: ${fileName}…`);

      const baseFileName = fs.withoutExtension(fileName);
      const mediaDir = `${formsDir}/${baseFileName}-media`;
      const xformPath = `${formsDir}/${baseFileName}.xml`;
      const baseDocId = (options.id_prefix || '') + baseFileName.replace(/-/g, ':');

      const mediaDirExists = fs.exists(mediaDir);
      if(!mediaDirExists) {
        log.info(`No media directory found at ${mediaDir} for form ${xformPath}`);
      }

      const xml = fs.read(xformPath);

      if(!formHasInstanceId(xml)) {
        log.error(`Form at ${xformPath} appears to be missing <meta><instanceID/></meta> node. This form will not work on medic-webapp.`);
        return failPromiseChain(promiseChain,
          'One or more forms appears to be missing <meta><instanceID/></meta> node. The upload process is aborted.');
      }

      const internalId = readIdFrom(xml);
      if(internalId !== baseDocId) log.warn('DEPRECATED', 'Form:', fileName, 'Bad ID set in XML.  Expected:', baseDocId, 'but saw:', internalId, ' Support for setting these values differently will be dropped.  Please see https://github.com/medic/medic-webapp/issues/3342.');

      const docId = `form:${baseDocId}`;
      const doc = {
        _id: docId,
        type: 'form',
        internalId: internalId,
        title: readTitleFrom(xml),
        context: options.default_context,
      };

      const propertiesPath = `${formsDir}/${baseFileName}.properties.json`;
      updateFromPropertiesFile(doc, propertiesPath);

      doc._attachments = mediaDirExists ? attachmentsFromDir(mediaDir) : {};
      doc._attachments.xml = attachmentFromFile(xformPath);

      const properties = SUPPORTED_PROPERTIES.concat('internalId');

      return promiseChain
        .then(() => warnUploadOverwrite.preUploadForm(db, doc, xml, properties))
        .then(changes => {
          if (changes) {
            return _formsValidate(xml)
              .catch(err => {
                log.error(`Form ${formsDir}/${fileName} with errors, API validations response: ${err.message}`);
                //TODO _formsValidate or insertOrReplace, not both
              })
              .then(() => insertOrReplace(db, doc))
              .then(() => log.info(`Form ${formsDir}/${fileName} uploaded`));
          } else {
            log.info(`Form ${formsDir}/${fileName} not uploaded, no changes`);
          }
        })
        // update hash regardless
        .then(() => warnUploadOverwrite.postUploadForm(doc, xml, properties));
    }, Promise.resolve());
};

let validateEndpointNotFoundLogged = false;

const _formsValidate = (xml) => {
  return api.formsValidate(xml)
    .then(resp => {
      if (resp.formsValidateEndpointFound === false &&
          !validateEndpointNotFoundLogged) {
        log.info('Form validation endpoint not found in the API, ' +
          'no form will be checked before push');
        validateEndpointNotFoundLogged = true; // Just log the message once
      }
    });
};

// This isn't really how to parse XML, but we have fairly good control over the
// input and this code is working so far.  This may break with changes to the
// formatting of output from xls2xform.
const readTitleFrom = xml => xml.substring(xml.indexOf('<h:title>') + 9, xml.indexOf('</h:title>'));
const readIdFrom = xml =>
    xml.match(/<model>[^]*<\/model>/)[0]
       .match(/<instance>[^]*<\/instance>/)[0]
       .match(/id="([^"]*)"/)[1];

const updateFromPropertiesFile = (doc, path) => {
  if (fs.exists(path)) {

    let ignoredKeys = [];
    const properties = fs.readJson(path);

    Object.keys(properties).forEach(key => {
      if (typeof properties[key] !== 'undefined') {
        if (SUPPORTED_PROPERTIES.includes(key)) {
          doc[key] = properties[key];
        } else if (key === 'internalId') {
          log.warn(`DEPRECATED: ${path}. Please do not manually set internalId in .properties.json for new projects. Support for configuring this value will be dropped. Please see https://github.com/medic/medic-webapp/issues/3342.`);
          doc.internalId = properties.internalId;
        } else {
          ignoredKeys.push(key);
        }
      }
    });

    if (ignoredKeys.length) {
      log.warn(`Ignoring unknown properties in ${path}: ${ignoredKeys.join(', ')}`);
    }
  }
};

const formHasInstanceId = xml => xml.includes('<instanceID/>');
