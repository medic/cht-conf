const fs = require('./sync-fs');
const jsonDiff = require('json-diff');
const readline = require('readline-sync');

const question = 'You are trying to modify a configuration that has been modified since your last upload. Do you want to?';
const responseChoicesWithoutDiff = [
  'Overwrite the changes', 
  'Abort so that you can update the configuration'
];
const responseChoicesWithDiff = responseChoicesWithoutDiff.concat([ 'View diff' ]);

const preUpload = async (projectDir, db, localDoc) => {

  // Pull remote _rev
  let remoteRev;
  let remoteDoc;
  try {
    remoteDoc = await db.get(localDoc._id);
    remoteRev = remoteDoc._rev;
  } catch (e) {
    // continue regardless of error
  }

  // Pull local _rev
  let localRev;
  try {
    localRev = fs.read(`${projectDir}/._revs/${localDoc._id}`);
  } catch (e) {
    // continue regardless of error
  }

  // Compare _revs
  // If _revs are different, show prompt
  if (!localRev) {
    if (!readline.keyInYN(`We can't determine if you're going to overwrite someone else's changes or not. Would you like to proceed?`)) {
      throw new Error('configuration modified');
    }
  } else if (localRev !== remoteRev) {
    let diff; 
    if (localDoc.settings && remoteDoc.settings) {
      diff = jsonDiff.diffString(remoteDoc.settings, localDoc.settings);
    } else {
      diff = jsonDiff.diffString(remoteDoc, localDoc);
    }

    if (diff) {
      let index = readline.keyInSelect(responseChoicesWithDiff, question);
      if (index === 2) { // diff
        console.log(diff);

        index = readline.keyInSelect(responseChoicesWithoutDiff, question);
      }
      if (index === 1) { // abort
        throw new Error('configuration modified');
      }
    }
  }
};

const postUpload = async (projectDir, db, localDoc) => {
  const remoteDoc = await db.get(localDoc._id);

  const dir = `${projectDir}/._revs`;
  if (!fs.exists(dir)){
    fs.mkdir(dir);
  }
  fs.write(`${dir}/${localDoc._id}`, remoteDoc._rev);
};

module.exports = {
  preUpload, 
  postUpload
};