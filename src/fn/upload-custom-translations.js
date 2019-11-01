const semver = require('semver');

const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const getApiVersion = require('../lib/get-api-version');
const iso639 = require('iso-639-1');
const { warn } = require('../lib/log');
const properties = require('properties');

const FILE_MATCHER = /messages-.*\.properties/;

module.exports = () => {
  const db = pouch(environment.apiUrl);

  const dir = `${environment.pathToProject}/translations`;

  return Promise.resolve()
    .then(() => {
      if(!fs.exists(dir)) return warn('Could not find custom translations dir:', dir);

      return Promise.all(fs.readdir(dir)
        .filter(name => FILE_MATCHER.test(name))
        .map(fileName => {
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

          return parse(`${dir}/${fileName}`, { path: true })
            .then(parsed =>
              db.get(id)
                .catch(e => {
                  if(e.status === 404) {
                    return newDocFor(fileName, db, languageName, languageCode);
                  }
                  
                  throw e;
                })
                .then(doc => overwriteProperties(doc, parsed))
                .then(doc => db.put(doc))
          );
        }));
    });

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
