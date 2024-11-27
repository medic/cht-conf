const path = require('path');
const minimist = require('minimist');
const userPrompt = require('../lib/user-prompt');

const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const log = require('../lib/log');
const pouch = require('../lib/db');
const progressBar = require('../lib/progress-bar');

const { info, trace, warn } = log;

const FILE_EXTENSION = '.doc.json';
const INITIAL_BATCH_SIZE = 100;

const execute = async () => {
  const args = minimist(environment.extraArgs || [], { boolean: true });

  const docDir = path.resolve(environment.pathToProject, args.docDirectoryPath || 'json_docs');
  if(!fs.exists(docDir)) {
    warn(`No docs directory found at ${docDir}.`);
    return Promise.resolve();
  }

  const filenamesToUpload = fs.recurseFiles(docDir).filter(name => name.endsWith(FILE_EXTENSION));
  const totalCount = filenamesToUpload.length;
  if (totalCount === 0) {
    return; // nothing to upload
  }

  const analysis = preuploadAnalysis(filenamesToUpload);
  const errors = analysis.map(result => result.error).filter(Boolean);
  if (errors.length > 0) {
    throw new Error(`upload-docs: ${errors.join('\n')}`);
  }

  warn(`This operation will permanently write ${totalCount} docs.  Are you sure you want to continue?`);
  if (!userPrompt.keyInYN()) {
    throw new Error('User aborted execution.');
  }

  // if feature flag is on
  const deletedDocIds = analysis.map(result => result.delete).filter(Boolean);
  await disableUsersAtDeletedFacilities(deletedDocIds);

  const results = { ok:[], failed:{} };
  const progress = log.level > log.LEVEL_ERROR ? progressBar.init(totalCount, '{{n}}/{{N}} docs ', ' {{%}} {{m}}:{{s}}') : null;
  const processNextBatch = async (docFiles, batchSize) => {
    const now = new Date();
    if(!docFiles.length) {
      if(progress) progress.done();

      const reportFile = `upload-docs.${now.getTime()}.log.json`;
      fs.writeJson(reportFile, results);
      info(`Summary: ${results.ok.length} of ${totalCount} docs uploaded OK.  Full report written to: ${reportFile}`);

      return;
    }

    const docs = docFiles.slice(0, batchSize)
        .map(file => {
          const doc = fs.readJson(file);
          doc.imported_date = now.toISOString();
          return doc;
        });

    trace('');
    trace(`Attempting to upload batch of ${docs.length} docs…`);

    try {
      const uploadResult = await pouch().bulkDocs(docs);
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
      if (err.error === 'timeout') {
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

  return processNextBatch(filenamesToUpload, INITIAL_BATCH_SIZE);
};

const preuploadAnalysis = filePaths =>
  filePaths
    .map(filePath => {
      const json = fs.readJson(filePath);
      const idFromFilename = path.basename(filePath, FILE_EXTENSION);

      if (json._id !== idFromFilename) {
        return { error: `File '${filePath}' sets _id:'${json._id}' but the file's expected _id is '${idFromFilename}'.` };
      }

      if (json._delete) {
        return { delete: json._id };
      }
    })
    .filter(Boolean);

const updateUsersAtDeletedFacilities = deletedDocIds => {
  // const urls = deletedDocIds.map(id => `/api/v2/users?facility_id=${id}`);
  // make api request per deleted document
  // how can we know which ids are worth querying? what about when we have delete-contacts and delete 10000 places?
  // store map of id -> userdoc and id -> [facility_ids] because multiple docs per facility and multiple facilities being deleted affecting same user

  // prompt to disable the list of usernames?

  // remove all facility_ids 
    // if it is an array, remove the facility_id
  
  // update each userdoc
    // if the array is not empty, update the user via POST /username
    // if the array is empty or it was not an array, disable the use via DELETE /username
};

module.exports = {
  requiresInstance: true,
  execute
};
