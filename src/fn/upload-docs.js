const path = require('path');
const minimist = require('minimist');
const semver = require('semver');

const api = require('../lib/api');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { getValidApiVersion } = require('../lib/get-api-version');
const log = require('../lib/log');
const pouch = require('../lib/db');
const progressBar = require('../lib/progress-bar');
const userPrompt = require('../lib/user-prompt');

const { info, trace, warn } = log;

const FILE_EXTENSION = '.doc.json';
const INITIAL_BATCH_SIZE = 100;

async function execute() {
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

  const analysis = analyseFiles(filenamesToUpload);
  const errors = analysis.map(result => result.error).filter(Boolean);
  if (errors.length > 0) {
    throw new Error(`upload-docs: ${errors.join('\n')}`);
  }

  userPrompt.warnPromptAbort(
    `This operation will permanently write ${totalCount} docs.  Are you sure you want to continue?`
  );

  const deletedDocIds = analysis.map(result => result.delete).filter(Boolean);
  await handleUsersAtDeletedFacilities(deletedDocIds);

  const results = { ok:[], failed:{} };
  const progress = log.level > log.LEVEL_ERROR
    ? progressBar.init(totalCount, '{{n}}/{{N}} docs ', ' {{%}} {{m}}:{{s}}')
    : null;
  const processNextBatch = async (docFiles, batchSize) => {
    const now = new Date();
    if(!docFiles.length) {
      if(progress) {
        progress.done();
      }

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
          warn(
            'Server connection timed out for batch size of 1 document.  '
            + 'We will continue to retry, but you might want to cancel the job if this continues.'
          );
          return processNextBatch(docFiles, 1);
        }
      } else {
        throw err;
      }
    }
  };

  return processNextBatch(filenamesToUpload, INITIAL_BATCH_SIZE);
}

function analyseFiles(filePaths) {
  return filePaths
    .map(filePath => {
      const json = fs.readJson(filePath);
      const idFromFilename = path.basename(filePath, FILE_EXTENSION);

      if (json._id !== idFromFilename) {
        return {
          error: `File '${filePath}' sets _id:'${json._id}' but the file's expected _id is '${idFromFilename}'.`
        };
      }

      if (json._deleted && json.cht_disable_linked_users) {
        return { delete: json._id };
      }
    })
    .filter(Boolean);
}

async function handleUsersAtDeletedFacilities(deletedDocIds) {
  if (!deletedDocIds?.length) {
    return;
  }

  await assertCoreVersion();
  
  const affectedUsers = await getAffectedUsers(deletedDocIds);
  const usernames = affectedUsers.map(userDoc => userDoc.username).join(', ');
  if (affectedUsers.length === 0) {
    trace('No users found needing an update.');
    return;
  }

  userPrompt.warnPromptAbort(
    `This operation will update ${affectedUsers.length} user accounts: ${usernames} and cannot be undone. `
    + 'Are you sure you want to continue?'
  );
  await updateAffectedUsers(affectedUsers);
}

async function assertCoreVersion() {
  const actualCoreVersion = await getValidApiVersion();
  if (semver.lt(actualCoreVersion, '4.7.0-dev')) {
    throw Error(
      `CHT Core Version 4.7.0 or newer is required to use --disable-users options. Version is ${actualCoreVersion}.`
    );
  }

  trace(`Core version is ${actualCoreVersion}. Proceeding to disable users.`);
}

async function getAffectedUsers(deletedDocIds) {
  const toPostApiFormat = (apiResponse) => {
    const places = Array.isArray(apiResponse.place) ? apiResponse.place.filter(Boolean) : [apiResponse.place];
    const placeIds = places.map(place => place?._id);
    return {
      username: apiResponse.username,
      place: placeIds,
    };
  };

  const knownUserDocs = {};
  for (const facilityId of deletedDocIds) {
    const fetchedUserInfos = await api().getUsersAtPlace(facilityId);
    for (const fetchedUserInfo of fetchedUserInfos) {
      const userDoc = knownUserDocs[fetchedUserInfo.username] || toPostApiFormat(fetchedUserInfo);
      removePlace(userDoc, facilityId);
      knownUserDocs[userDoc.username] = userDoc;
    }
  }

  return Object.values(knownUserDocs);
}

function removePlace(userDoc, placeId) {
  if (Array.isArray(userDoc.place)) {
    userDoc.place = userDoc.place
      .filter(id => id !== placeId);
  } else {
    delete userDoc.place;
  }
}

async function updateAffectedUsers(affectedUsers) {
  let disabledUsers = 0;
  let updatedUsers = 0;
  for (const userDoc of affectedUsers) {
    const shouldDisable = !userDoc.place || userDoc.place?.length === 0;
    if (shouldDisable) {
      trace(`Disabling ${userDoc.username}`);
      await api().disableUser(userDoc.username);
      disabledUsers++;
    } else {
      trace(`Updating ${userDoc.username}`);
      await api().updateUser(userDoc);
      updatedUsers++;
    }
  }

  info(`${disabledUsers} users disabled. ${updatedUsers} users updated.`);
}

module.exports = {
  requiresInstance: true,
  execute
};
