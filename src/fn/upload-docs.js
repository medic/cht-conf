const path = require('path');

const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const progressBar = require('../lib/progress-bar');
const skipFn = require('../lib/skip-fn');

const log = require('../lib/log');
const { info, trace, warn } = log;

const FILE_EXTENSION = '.doc.json';
const INITIAL_BATCH_SIZE = 100;

module.exports = async (projectDir, couchUrl) => {
  if(!couchUrl) {
    return skipFn('no couch URL set');
  }

  const docDir = path.join(projectDir, 'json_docs');
  if(!fs.exists(docDir)) {
    warn(`No docs directory found at ${docDir}.`);
    return Promise.resolve();
  }

  const filesToUpload = fs.recurseFiles(docDir).filter(name => name.endsWith(FILE_EXTENSION));
  filesToUpload.forEach(ensureDocumentIdMatchesFilename);

  const totalCount = filesToUpload.length;
  info(`Uploading ${totalCount} docs.  This may take some time to start…`);

  const db = pouch(couchUrl);
  const results = { ok:[], failed:{} };
  const progress = log.level > log.LEVEL_ERROR ? progressBar.init(totalCount, '{{n}}/{{N}} docs ', ' {{%}} {{m}}:{{s}}') : null;
  const processNextBatch = async (docFiles, batchSize) => {
    const now = new Date();
    if(!docFiles.length) {
      if(progress) progress.done();
  
      const reportFile = `upload-docs.${now}.log.json`;
      fs.writeJson(reportFile, results);
      info(`Summary: ${results.ok.length} of ${totalCount} docs uploaded OK.  Full report written to: ${reportFile}`);
  
      return;
    }
  
    const docs = docFiles.slice(0, batchSize)
        .map(file => {
          const doc = fs.readJson(file);
          doc.imported_date = now.getTime();
          return doc;
        });
  
    trace('');
    trace(`Attempting to upload batch of ${docs.length} docs…`);
  
    try {
      const uploadResult = await db.bulkDocs(docs);
      if(progress) {
        progress.increment(docs.length);
      }

      uploadResult.forEach(result => {
        if(result.error) {
          results.failed[result.id] = `${result.error}: ${result.reason}`;
        } else {
          results.ok.push(result.id);
        }
      });

      return processNextBatch(docFiles.slice(batchSize), batchSize);
    } catch (err) {
      if (err.code === 'ESOCKETTIMEDOUT') {
        if (batchSize > 1) {
          trace('');
          trace('Server connection timed out.  Decreasing batch size…');
          return processNextBatch(docFiles, batchSize / 2);
        } else {
          warn('Server connection timed out for batch size of 1 document.  We will continue to retry, but you might want to cancel the job if this continues.');
          return processNextBatch(docFiles, 1);
        }
      } else {
        throw err;
      }
    }
  };

  return processNextBatch(filesToUpload, INITIAL_BATCH_SIZE);
};

function ensureDocumentIdMatchesFilename(pathToDoc) {
  const json = fs.readJson(pathToDoc);
  const idFromFilename = path.basename(pathToDoc, FILE_EXTENSION);

  if(json._id !== idFromFilename) {
    throw new Error(`upload-docs: File '${pathToDoc}' sets _id:'${json._id}' but the expected _id is '${idFromFilename}'.`);
  }
}
