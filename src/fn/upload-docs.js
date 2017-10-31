const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const pouch = require('../lib/db');
const skipFn = require('../lib/skip-fn');
const trace = require('../lib/log').trace;
const warn = require('../lib/log').warn;

const BATCH_SIZE = 100;

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  const docDir = `${projectDir}/json_docs`;
  const db = pouch(couchUrl);

  if(!fs.exists(docDir)) {
    warn(`No docs directory found at ${docDir}.`);
    return Promise.resolve();
  }

  let docFiles = fs.recurseFiles(docDir)
    .filter(name => name.endsWith('.doc.json'));

  docFiles
    .forEach(validateJson);

  const sets = [];
  const totalCount = docFiles.length;
  while(docFiles.length) {
    sets.push(docFiles.slice(0, BATCH_SIZE));
    docFiles = docFiles.slice(BATCH_SIZE);
  }

  info(`Uploading ${totalCount} docs in ${sets.length} sets…`);

  const results = { ok:[], failed:{} };

  const process = sets.reduce((promiseChain, docSet) =>
    promiseChain.then(() => {
      const now = new Date().toISOString();
      const docs = docSet.map(file => {
        const doc = fs.readJson(file);
        doc.imported_date = now;
        return doc;
      });

      return db.bulkDocs(docs)
        .then(res => {
          trace(`Processed ${docSet.length} docs.`);
          res.forEach(r => {
            if(r.error) {
              results.failed[r.id] = `${r.error}: ${r.reason}`;
            } else {
              results.ok.push(r.id);
            }
          });
        });
    }),
    Promise.resolve());

  return process
    .then(() => {
      const okCount = results.ok.length;
      info('Upload failed for:\n' + JSON.stringify(results.failed, null, 2));
      info(`Summary: ${okCount} of ${totalCount} docs uploaded OK.`);
    });
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
