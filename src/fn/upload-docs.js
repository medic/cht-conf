const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const log = require('../lib/log');
const pouch = require('../lib/db');
const progressBar = require('../lib/progress-bar');
const skipFn = require('../lib/skip-fn');
const trace = require('../lib/log').trace;
const warn = require('../lib/log').warn;

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  const docDir = `${projectDir}/json_docs`;
  const db = pouch(couchUrl);

  if(!fs.exists(docDir)) {
    warn(`No docs directory found at ${docDir}.`);
    return Promise.resolve();
  }

  const docFiles = fs.recurseFiles(docDir)
    .filter(name => name.endsWith('.doc.json'));

  docFiles
    .forEach(validateJson);

  const totalCount = docFiles.length;

  info(`Uploading ${totalCount} docs.  This may take some time to start…`);

  const results = { ok:[], failed:{} };

  const progress = log.level > log.LEVEL_ERROR ?
      progressBar.init(totalCount, '{{n}}/{{N}} docs ', ' {{%}} {{m}}:{{s}}') : null;

  return processNextBatch(docFiles, 100);

  function processNextBatch(docFiles, batchSize) {
    if(!docFiles.length) {
      if(progress) progress.done();

      const reportFile = `upload-to-docs.${Date.now()}.log.json`;
      fs.writeJson(reportFile, results);
      info(`Summary: ${results.ok.length} of ${totalCount} docs uploaded OK.  Full report written to: ${reportFile}`);

      return Promise.resolve();
    }

    const now = new Date().toISOString();
    const docs = docFiles.slice(0, batchSize)
        .map(file => {
          const doc = fs.readJson(file);
          doc.imported_date = now;
          return doc;
        });

    if(log.level >= log.LEVEL_TRACE) console.log();
    trace(`Attempting to upload batch of ${docs.length} docs…`);

    return db.bulkDocs(docs)
      .then(res => {
          if(progress) progress.inc(docs.length);
          res.forEach(r => {
            if(r.error) {
              results.failed[r.id] = `${r.error}: ${r.reason}`;
            } else {
              results.ok.push(r.id);
            }
          });
          return processNextBatch(docFiles.slice(batchSize), batchSize + 10);
      })
      .catch(err => {
        if(err.code === 'ESOCKETTIMEDOUT') {
          if(batchSize > 1) {
            if(log.level >= log.LEVEL_TRACE) console.log();
            trace('Server connection timed out.  Decreasing batch size…');
            return processNextBatch(docFiles, batchSize >> 1);
          } else {
            warn('Server connection timed out for batch size of 1 document.  We will continue to retry, but you might want to cancel the job if this continues.');
            return processNextBatch(docFiles, 1);
          }
        } else throw err;
      });
  }
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
