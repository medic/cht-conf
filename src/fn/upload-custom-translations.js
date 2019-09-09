const fs = require('../lib/sync-fs');
const semver = require('semver');

const { warn } = require('../lib/log');

const FILE_MATCHER = /messages-.*\.properties/;

module.exports = (projectDir, repository) => {
  const dir = `${projectDir}/translations`;
  
  return Promise.resolve()
    .then(() => {
      if(!fs.exists(dir)) return warn('Could not find custom translations dir:', dir);

      return Promise.all(fs.readdir(dir)
        .filter(name => FILE_MATCHER.test(name))
        .map(fileName => {
          var translations = propertiesAsObject(`${dir}/${fileName}`);

          return repository.get(idFor(fileName))
            .catch(e => {
              if(e.status === 404) {
                return newDocFor(fileName, repository);
              }
              
              throw e;
            })
            .then(doc => overwriteProperties(doc, translations))
            .then(doc => repository.put(doc));
        }));
    });

};

function propertiesAsObject(path) {
  const vals = {};
  fs.read(path)
    .split('\n')
    .filter(line => line.includes('='))
    .map(line => line.split(/=(.*)/, 2).map(it => it.trim()))
    .map(([k, v]) => vals[k] = v);
  return vals;
}

function overwriteProperties(doc, props) {
  if(doc.generic) {
    // 3.4.0 translation structure
    doc.custom = props;
  } else if (doc.values) {
    // pre-3.4.0 doc structure
    for(const k in props) {
      if(props.hasOwnProperty(k)) {
        doc.values[k] = props[k];
      }
    }
  } else {
    throw new Error(`Existent translation doc ${doc._id} is malformed`);
  }

  return doc;
}

async function newDocFor(fileName, repository) {
  const id = idFor(fileName);

  const doc = {
    _id: id,
    type: 'translations',
    code: id.substring(id.indexOf('-') + 1),
    name: 'TODO: please ask admin to set this in settings UI',
    enabled: true,
  };

  const useGenericTranslations = await genericTranslationsStructure(repository);
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

async function genericTranslationsStructure(repository) {
  const version = await repository.version();

  if (semver.valid(version)) {
    return semver.gte(version, '3.4.0');
  }

  return repository.get('messages-en')
    .then(doc => doc.generic)
    .catch(() => false);
}

