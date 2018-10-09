const fs = require('../lib/sync-fs');
const utils = require('../lib/translation-file-utils');
const skipFn = require('../lib/skip-fn');
const warn = require('../lib/log').warn;
const pouch = require('../lib/db');

const FILE_MATCHER = /messages-.*\.properties/;

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  const dir = `${projectDir}/translations`;
  const db = pouch(couchUrl);

  return Promise.resolve()
    .then(() => {
      if(!fs.exists(dir)) return warn('Could not find custom translations dir:', dir);

      return Promise.all(fs.readdir(dir)
        .filter(name => FILE_MATCHER.test(name))
        .map(fileName => {
          var translations = utils.propertiesAsObject(`${dir}/${fileName}`);

          return db.get(utils.idFor(fileName))
            .catch(e => {
              if(e.status === 404) return utils.newDocFor(fileName);
              else throw e;
            })
            .then(doc => utils.mergeProperties(doc, translations))
            .then(doc => db.put(doc));
        }));
    });

};