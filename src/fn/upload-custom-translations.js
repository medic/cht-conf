const semver = require('semver');

const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const getApiVersion = require('../lib/get-api-version');
const iso639 = require('iso-639-1');
const { error, warn, info } = require('../lib/log');
const properties = require('properties');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');
const MessageFormat = require('messageformat');

const FILE_MATCHER = /^messages-.*\.properties$/;

const HAS_MUSTACHE_MATCHER = /{{[\s\w.]+}}/;

const transErrorsMsg = new MessageFormat('en')
  .compile('There {ERRORS, plural, one{was 1 error} other{were # errors}} trying to compile the translations');

const execute = async () => {
  const db = pouch(environment.apiUrl);

  const dir = `${environment.pathToProject}/translations`;

  if(!fs.exists(dir)) return warn('Could not find custom translations dir:', dir);

  const fileNames = fs.readdir(dir)
                      .filter(name => FILE_MATCHER.test(name));

  for (let fileName of fileNames) {
    const id = idFor(fileName);
    const languageCode = id.substring('messages-'.length);
    if (!isLanguageCodeValid(languageCode)) {
      throw new Error(`The language code '${languageCode}' is not valid. It must begin with a letter(a–z, A-Z), followed by any number of hyphens, underscores, letters, or numbers.`);
    }

    let languageName = iso639.getName(languageCode);
    if (!languageName){
      warn(`'${languageCode}' is not a recognized ISO 639 language code, please ask admin to set the name`);
      languageName = 'TODO: please ask admin to set this in settings UI';
    } else {
      let languageNativeName = iso639.getNativeName(languageCode);
      if (languageNativeName !== languageName){
        languageName = `${languageNativeName} (${languageName})`;
      }
    }

    const translations = await parse(`${dir}/${fileName}`, { path: true });

    checkTranslations(translations, languageCode);

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
      info(`Translation ${dir}/${fileName} uploaded`);
    } else {
      info(`Translation ${dir}/${fileName} not uploaded as no changes were found`);
    }

    warnUploadOverwrite.postUploadDoc(doc);
  }
};

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

function checkTranslations(translations, languageCode) {
  let mf = null;
  try {
    mf = new MessageFormat(languageCode);
  } catch (e) {
    warn(`Cannot check '${languageCode}' translations: ${e.message}`);
  }
  let foundError = 0;
  for (const [msgKey, msgSrc] of Object.entries(translations)) {
    if (!msgSrc) {
      warn(`Empty '${languageCode}' translation for '${msgKey}' key`);
    } else if (mf) {
      try {
        mf.compile(msgSrc);
      } catch (e) {
        if (!HAS_MUSTACHE_MATCHER.test(msgSrc)) {
          error(`Cannot compile '${languageCode}' translation ${msgKey} = '${msgSrc}' : ` + e.message);
          foundError++;
        }
      }
    }
  }
  if (foundError > 0) {
    error(transErrorsMsg({ERRORS: foundError}));
    process.exit(-1);
  }
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
