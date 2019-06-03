const fs = require('../lib/sync-fs');
const skipFn = require('../lib/skip-fn');
const warn = require('../lib/log').warn;
const pouch = require('../lib/db');
const request = require('request-promise-native');

const FILE_MATCHER = /messages-.*\.properties/;

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  const dir = `${projectDir}/translations`;
  const db = pouch(couchUrl);

  return getMedicVersion()
    .then(version => {
      if(!fs.exists(dir)) return warn('Could not find custom translations dir:', dir);

      return Promise.all(fs.readdir(dir)
        .filter(name => FILE_MATCHER.test(name))
        .map(fileName => {
          var translations = propertiesAsObject(`${dir}/${fileName}`);

          return db.get(idFor(fileName))
            .catch(e => {
              if(e.status === 404) return newDocFor(fileName);
              else throw e;
            })
            .then(doc => overwriteProperties(doc, translations, version))
            .then(doc => db.put(doc));
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

function overwriteProperties(doc, props, version) {
  if((version.major === 3 && version.minor >= 4) || version.major > 3 ) {
    // TODO: link to how the translation layout changed in git
    if (!doc.generic) {
      doc.generic = {};
    }

    doc.custom = props;
  } else {
    // pre-3.4.0 doc structure
    if(!doc.values) {
      doc.values = {};
    }
    for(const k in props) {
      if(props.hasOwnProperty(k)) {
        doc.values[k] = props[k];
      }
    }
  }

  return doc;
}

// TODO?: pass version and add empty generic for >=3.4.0
function newDocFor(fileName) {
  const id = idFor(fileName);

  return {
    _id: id,
    type: 'translations',
    code: id.substring(id.indexOf('-') + 1),
    name: 'TODO: please ask admin to set this in settings UI',
    enabled: true,
  };
}

function idFor(fileName) {
  return fileName.substring(0, fileName.length - 11);
}

function getMedicVersion(){
  return  request.get({
    url: couchUrl + '/api/info',
    json: true
  }).then(result => {
    var versionArray = result.version.split('.');
    const version = {};
    version.major = versionArray[0];
    version.minor = versionArray[1];
    version.patch = versionArray[2];
    return version;
  });
}