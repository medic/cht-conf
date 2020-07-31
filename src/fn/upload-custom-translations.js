const semver = require('semver');

const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const getApiVersion = require('../lib/get-api-version');
const iso639 = require('iso-639-1');
const log = require('../lib/log');
const properties = require('properties');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');
const MessageFormat = require('messageformat');

const FILE_MATCHER = /^messages-.*\.properties$/;

const EN_FILE = 'messages-en.properties';
const EX_FILE = 'messages-ex.properties';

const MFORMAT = new MessageFormat('en');
const transErrorsMsg = MFORMAT
  .compile('There {ERRORS, plural, one{was 1 error} other{were # errors}} trying to compile');
const transEmptyMsg = MFORMAT
  .compile('There {EMPTIES, plural, one{was 1 empty translation} other{were # empty translations}} trying to compile');

const execute = async () => {
  const db = pouch(environment.apiUrl);

  const dir = `${environment.pathToProject}/translations`;

  if(!fs.exists(dir)) return log.warn('Could not find custom translations dir:', dir);

  const fileNames = fs.readdir(dir)
                      .filter(name => FILE_MATCHER.test(name));
  const enTranslationIndex = fileNames.indexOf(EN_FILE);
  const exTranslationIndex = fileNames.indexOf(EX_FILE);
  let templatePlaceholders;
  if (enTranslationIndex < 0) {
    log.warn(`Could not find english translations: ${dir}/${EN_FILE}`);
    templatePlaceholders = null;
  } else {
    const engTranslations = await processLanguageFile(db, dir, EN_FILE);
    let extraTranslations = {};
    if (exTranslationIndex >= 0) {
      extraTranslations = await processLanguageFile(db, dir, EX_FILE);
    }
    templatePlaceholders = extractPlaceholdersFromTranslations(engTranslations, extraTranslations);
  }
  for (let i = 0; i < fileNames.length; i++) {
    if (i !== enTranslationIndex && i !== exTranslationIndex) { // Do not process again 'en' and 'ex'
      await processLanguageFile(db, dir, fileNames[i], templatePlaceholders);
    }
  }
};

async function processLanguageFile(db, dir, fileName, templatePlaceholders) {
  const id = idFor(fileName);
  const languageCode = id.substring('messages-'.length);
  if (!isLanguageCodeValid(languageCode)) {
    throw new Error(`The language code '${languageCode}' is not valid. It must begin with a letter(a–z, A-Z), followed by any number of hyphens, underscores, letters, or numbers.`);
  }

  let languageName = iso639.getName(languageCode);
  if (!languageName){
    log.warn(`'${languageCode}' is not a recognized ISO 639 language code, please ask admin to set the name`);
    languageName = 'TODO: please ask admin to set this in settings UI';
  } else {
    let languageNativeName = iso639.getNativeName(languageCode);
    if (languageNativeName !== languageName){
      languageName = `${languageNativeName} (${languageName})`;
    }
  }

  const translations = await parse(`${dir}/${fileName}`, { path: true });

  checkTranslations(translations, languageCode, templatePlaceholders);

  let doc;
  try {
    doc = await db.get(idFor(fileName));
  } catch(e) {
    if (e.status === 404) {
      doc = await newDocFor(fileName, db, languageName, languageCode);
    }
    else throw e;
  }

  overwriteProperties(doc, translations);

  const changes = await warnUploadOverwrite.preUploadDoc(db, doc);

  if (changes) {
    await db.put(doc);
    log.info(`Translation ${dir}/${fileName} uploaded`);
  } else {
    log.info(`Translation ${dir}/${fileName} not uploaded as no changes were found`);
  }

  warnUploadOverwrite.postUploadDoc(doc);

  return translations;
}

function isLanguageCodeValid(code) {
  // valid CSS selector name to avoid https://github.com/medic/medic/issues/5982
  var regex = /^[_a-zA-Z]+[_a-zA-Z0-9-]+$/;
  return regex.test(code);
}

function parse(filePath, options) {
  return new Promise((resolve, reject) => {
    properties.parse(filePath, options, (err, parsed) => {
      if (err) return reject(err);
      resolve(parsed);
    });
  });
}

function checkTranslations(translations, lang, templatePlaceholders) {
  let mf = null;
  try {
    mf = new MessageFormat(lang);
  } catch (e) {
    log.warn(`Cannot check '${lang}' translations: ${e.message}`);
  }
  const placeholders = extractPlaceholdersFromTranslations(translations);
  let formatErrorsFound = 0;
  let placeholderErrorsFound = 0;
  let emptiesFound = 0;
  for (const [msgKey, msgSrc] of Object.entries(translations)) {
    if (!msgSrc) {
      emptiesFound++;
    } else if (/{{[\s\w.#^/'|]+}}/.test(msgSrc)) {
      if (templatePlaceholders) {
        const placeholder = placeholders[msgKey];
        if (placeholder) {
          const templatePlaceholder = templatePlaceholders[msgKey];
          if (!templatePlaceholder) {
            log.error(`Cannot compile '${lang}' translation with key '${msgKey}' ` +
              `has placeholders, but the key does not match any of ${EN_FILE}\n` +
              'You can use messages-ex.properties to add placeholders missing from the reference context.');
            placeholderErrorsFound++;
          } else {
            const foundAllPlaceholders = placeholder.every(el => templatePlaceholder.includes(el));
            if (!foundAllPlaceholders) {
              log.error(`Cannot compile '${lang}' translation with key '${msgKey}' ` +
                `has placeholders that do not match those of ${EN_FILE}\n` +
                'You can use messages-ex.properties to add placeholders missing from the reference context.');
              placeholderErrorsFound++;
            }
          }
        }
      }
    } else if (mf && typeof msgSrc === 'string') {
      try {
        mf.compile(msgSrc);
      } catch (e) {
        log.error(`Cannot compile '${lang}' translation ${msgKey} = '${msgSrc}' : ${e.message}`);
        formatErrorsFound++;
      }
    }
  }
  if (emptiesFound > 0) {
    log.warn(transEmptyMsg({EMPTIES: emptiesFound}) + ` '${lang}' translations`);
  }
  if (formatErrorsFound > 0 || placeholderErrorsFound > 0) {
    log.error(transErrorsMsg({ERRORS: formatErrorsFound + placeholderErrorsFound})
              + ` '${lang}' translations`);
    process.exit(-1);
  }
}

function extractPlaceholdersFromTranslations(translations, extraPlaceholders = {}) {
  // Extract from github.com/medic/cht-core/blob/master/scripts/poe/lib/utils.js
  const result = {};
  for (const [msgKey, msgSrc] of Object.entries(translations)) {
    let placeholders = typeof msgSrc === 'string' ? msgSrc.match(/{{[\s\w.#^/'|]+}}/g) : null;
    if (placeholders) {
      placeholders = placeholders
        .sort()
        .concat(extraPlaceholders[msgKey] ? extraPlaceholders[msgKey] : [])
        .filter((el, i, a) => i === a.indexOf(el));
      result[msgKey] = placeholders;
    } else if (extraPlaceholders[msgKey]) {
      result[msgKey] = extraPlaceholders[msgKey];
    }
  }
  return result;
}

function overwriteProperties(doc, props) {
  if(doc.generic) {
    // 3.4.0 translation structure
    doc.custom = props;
  } else if (doc.values) {
    // pre-3.4.0 doc structure
    for (const [key, value] of Object.entries(props)) {
      doc.values[key] = value;
    }
  } else {
    throw new Error(`Existent translation doc ${doc._id} is malformed`);
  }

  return doc;
}

async function newDocFor(fileName, db, languageName, languageCode) {
  const doc = {
    _id: idFor(fileName),
    type: 'translations',
    code: languageCode,
    name: languageName,
    enabled: true,
  };

  const useGenericTranslations = await genericTranslationsStructure(db);
  if (useGenericTranslations) {
    doc.generic = {};
  } else {
    doc.values = {};
  }

  return doc;
}

function idFor(fileName) {
  return fileName.substring(0, fileName.length - 11);
}

async function genericTranslationsStructure(db) {
  const version = await getApiVersion();

  if (semver.valid(version)) {
    return semver.gte(version, '3.4.0');
  }

  return db.get('messages-en')
    .then(doc => doc.generic)
    .catch(() => false);
}

module.exports = {
  requiresInstance: true,
  execute
};
