const fs = require('./sync-fs');
const jsonDiff = require('json-diff');
const readline = require('readline-sync');
const crypto = require('crypto');
const url = require('url');

const question = 'You are trying to modify a configuration that has been modified since your last upload. Do you want to?';
const responseChoicesWithoutDiff = [
  'Overwrite the changes', 
  'Abort so that you can update the configuration'
];
const responseChoicesWithDiff = responseChoicesWithoutDiff.concat([ 'View diff' ]);

const getRevsDocKey = (couchUrl) => {
  const parsed = url.parse(couchUrl);
  const key = `${parsed.hostname}${parsed.pathname || 'medic'}`;
  return key;
};

const preUpload = async (projectDir, db, doc, couchUrl) => {
  let localDoc = JSON.parse(JSON.stringify(doc));

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
    localRev = JSON.parse(fs.read(`${projectDir}/._revs/${localDoc._id}.json`).trim())[getRevsDocKey(couchUrl)];
  } catch (e) {
    // continue regardless of error
  }

  if (localRev) {
    localDoc._rev = localRev;
  }

  if (localDoc._attachments) {
    for (let key in localDoc._attachments) {
      localDoc._attachments[key] = {
        'content_type': doc._attachments[key].content_type, 
        'revpos': localRev ? parseInt(localRev.split('-')[0]) : 0, 
        'length': doc._attachments[key].data.length,
        'digest': `md5-${crypto.createHash('md5').update(doc._attachments[key].data, 'binary').digest('base64')}`,
        'stub': true
      };
    }
  }

  let diff; 
  if (localDoc._id === 'settings' && remoteDoc._id === 'settings') {
    diff = jsonDiff.diffString(remoteDoc.settings, localDoc.settings);
  } else {
    diff = jsonDiff.diffString(remoteDoc, localDoc);
  }
  if (diff) {  
    if (!localRev) {
      if (!readline.keyInYN(`We can't determine if you're going to overwrite someone else's changes or not. Would you like to proceed?`)) {
        throw new Error('configuration modified');
      }
    } else if (localRev !== remoteRev) {
      let index = readline.keyInSelect(responseChoicesWithDiff, question, {cancel: false});
      if (index === 2) { // diff
        console.log(diff);

        index = readline.keyInSelect(responseChoicesWithoutDiff, question, {cancel: false});
      }
      if (index === 1) { // abort
        throw new Error('configuration modified');
      }
    }
  }

  return doc;
};

const postUpload = async (projectDir, db, doc, couchUrl) => {
  const remoteDoc = await db.get(doc._id);

  const revsDir = `${projectDir}/._revs`;
  if (!fs.exists(revsDir)){
    fs.mkdir(revsDir);
  }

  let revs = {};

  const revsFile = `${revsDir}/${doc._id}.json`;
  if (fs.exists(revsFile)) {
    Object.assign(revs, JSON.parse(fs.read(revsFile).trim()));
  }
  revs[getRevsDocKey(couchUrl)] = remoteDoc._rev;

  fs.write(revsFile, JSON.stringify(revs));

  return doc;
};

module.exports = {
  preUpload, 
  postUpload
};