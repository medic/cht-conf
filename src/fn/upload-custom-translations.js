const fs = require('../lib/sync-fs');
const warn = require('../lib/log').warn;
const PouchDB = require('pouchdb');

const FILE_MATCHER = /messages-.*\.properties/;

module.exports = (project, couchUrl) => {
  const dir = `${project}/translations`;
  const db = new PouchDB(couchUrl);

  return Promise.resolve()
    .then(() => {
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
            .then(doc => mergeProperties(doc, translations))
            .then(doc => db.put(doc));
        }));
    });

};

function propertiesAsObject(path) {
  const vals = {};
  fs.read(path)
    .split('\n')
    .filter(line => line.includes('='))
    .map(line => line.split('=', 2).map(it => it.trim()))
    .map(([k, v]) => vals[k] = v);
  return vals;
}

function mergeProperties(doc, props) {
  if(!doc.values) doc.values = {};

  for(const k in props) {
    if(props.hasOwnProperty(k)) doc.values[k] = props[k];
  }

  return doc;
}

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
