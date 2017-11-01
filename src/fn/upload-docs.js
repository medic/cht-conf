const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const log = require('../lib/log');
const PouchDB = require('pouchdb');
const pouchHttp = require('../lib/remote-db');
const progressBar = require('../lib/progress-bar');
const skipFn = require('../lib/skip-fn');
const warn = require('../lib/log').warn;

const LOCAL_BATCH_SIZE = 1000;
const REMOTE_BATCH_SIZE = 100;

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  const docDir = `${projectDir}/json_docs`;
  const dbPath = './json_docs.pouch.db';
  const localDb = PouchDB(dbPath);
  const remoteDb = pouchHttp(couchUrl);

  if(!fs.exists(docDir)) {
    warn(`No docs directory found at ${docDir}.`);
    return Promise.resolve();
  }

  info(`Searching for .doc.json files in '${docDir}'…`);

  let docFiles = fs.recurseFiles(docDir)
    .filter(name => name.endsWith('.doc.json'));

  docFiles
    .forEach(validateJson);

  const sets = [];
  const totalCount = docFiles.length;
  while(docFiles.length) {
    sets.push(docFiles.slice(0, LOCAL_BATCH_SIZE));
    docFiles = docFiles.slice(LOCAL_BATCH_SIZE);
  }

  info(`Saving ${totalCount} docs to local db ${dbPath}…`);

  const process = sets.reduce((promiseChain, docSet) =>
    promiseChain.then(() => {
      const now = new Date().toISOString();
      const docs = docSet.map(file => {
        const doc = fs.readJson(file);
        doc.imported_date = now;
        return doc;
      });

      return localDb.bulkDocs(docs);
    }),
    Promise.resolve());

  return process
    .then(() => info('Docs saved OK.'))
    .then(() => info('Syncing to remote db…'))
    .then(() => new Promise((resolve, reject) => {
      let progress;
      localDb
        .replicate.to(remoteDb, { timeout:120000, checkpoint:false, batch_size:REMOTE_BATCH_SIZE })
        .on('active', () => {
          if(log.level > log.LEVEL_ERROR) progress = progressBar.init(totalCount, '{{n}}/{{N}} docs ', ' {{%}} {{m}}:{{s}}');
        })
        .on('change', details => {
          if(progress) progress.inc(REMOTE_BATCH_SIZE);
        })
        .on('complete', details => {
          if(progress) progress.done();
          info(`Replication complete.  Wrote ${details.docs_written} of ${totalCount} docs to remote DB.`);
          info('Errors:', details.errors);
          if(details.docs_written < totalCount && !details.errors.length) {
            info('There were no errors, but not all docs were uploaded.  Some of these docs may have been uploaded previously.');
          }
          resolve();
        })
        .on('error', err => {
          if(progress) progress.cancel();
          reject(err);
        });
    }));
};

function idFromFilename(doc) {
  const name = fs.path.basename(doc);
  return name.substring(0, name.length - 9);
}

function validateJson(doc) {
  const json = fs.readJson(doc);
  if(json._id !== idFromFilename(doc)) {
    throw new Error(`_id property '${json._id}' did not match implied ID for doc in file ${doc} (expected: ${idFromFilename(doc)})!`);
  }
}
