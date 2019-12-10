const fs = require('./sync-fs');
const jsonDiff = require('json-diff');
const readline = require('readline-sync');
const crypto = require('crypto');
const url = require('url');
const log = require('./log');
const environment = require('./environment');
const { compare, GroupingReporter } = require('dom-compare');
const DOMParser = require('xmldom').DOMParser;

const question = 'You are trying to modify a configuration that has been modified since your last upload. Do you want to?';
const responseChoicesWithoutDiff = [
  'Overwrite the changes', 
  'Abort so that you can update the configuration'
];
const responseChoicesWithDiff = responseChoicesWithoutDiff.concat([ 'View diff' ]);

const getRevsAndHashesDocKey = () => {
  const parsed = url.parse(environment.apiUrl);
  const key = `${parsed.hostname}${parsed.pathname || 'medic'}`;
  return key;
};

const preUploadByRev = async (db, doc) => {
  let localDoc = JSON.parse(JSON.stringify(doc));

  // Pull remote _rev
  let remoteRev;
  let remoteDoc;
  try {
    remoteDoc = await db.get(localDoc._id);
    remoteRev = remoteDoc._rev;
  } catch (e) {
    // continue regardless of error
    log.trace('Trying to fetch remote _rev', e);
  }

  // Pull local _rev
  let localRev;
  try {
    localRev = JSON.parse(fs.read(`${environment.pathToProject}/._revs/${localDoc._id}.json`).trim())[getRevsAndHashesDocKey()];
  } catch (e) {
    // continue regardless of error
    log.trace('Trying to fetch local _rev', e);
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
        log.info(diff);

        index = readline.keyInSelect(responseChoicesWithoutDiff, question, {cancel: false});
      }
      if (index === 1) { // abort
        throw new Error('configuration modified');
      }
    }
  }

  return doc;
};

const postUploadByRev = async (db, doc) => {
  const remoteDoc = await db.get(doc._id);

  const revsDir = `${environment.pathToProject}/._revs`;
  if (!fs.exists(revsDir)){
    fs.mkdir(revsDir);
  }

  let revs = {};

  const revsFile = `${revsDir}/${doc._id}.json`;
  if (fs.exists(revsFile)) {
    Object.assign(revs, JSON.parse(fs.read(revsFile).trim()));
  }
  revs[getRevsAndHashesDocKey()] = remoteDoc._rev;

  fs.write(revsFile, JSON.stringify(revs));

  return doc;
};

const preUploadByXml = async (db, docId, localXml) => {
  let storedHash;
  try {
    storedHash = JSON.parse(fs.read(`${environment.pathToProject}/.hashes/${docId}.json`).trim())[getRevsAndHashesDocKey()];
  } catch (e) {
    // continue regardless of error
    log.trace('Trying to fetch stored hash', e);
  }

  const localHash = crypto.createHash('md5').update(localXml, 'binary').digest('base64');
  if (storedHash === localHash) {
    throw new Error('No changes');
  }

  let remoteXml;
  try {
    const buffer = await db.getAttachment(docId, 'xml');
    remoteXml = buffer.toString('utf8');
  } catch (e) {
    if (e.status === 404) {
      return Promise.resolve();
    } else {
      // continue regardless of error
      log.trace('Trying to fetch remote xml', e);
      throw new Error(`Unable to fetch xml attachment of doc with id ${docId}, returned status code = ${e.status}`);
    }
  }

  const remoteHash = crypto.createHash('md5').update(remoteXml, 'binary').digest('base64');
  if (storedHash === remoteHash) {
    return Promise.resolve();
  }

  const localDom = new DOMParser().parseFromString(localXml);
  const remoteDom = new DOMParser().parseFromString(remoteXml);

  const diff = compare(localDom, remoteDom);
  const hasNoDiff = diff.getResult();
  if (!hasNoDiff) {
    let index = readline.keyInSelect(responseChoicesWithDiff, question, {cancel: false});
    if (index === 2) { // diff
      log.info(GroupingReporter.report(diff));

      index = readline.keyInSelect(responseChoicesWithoutDiff, question, {cancel: false});
    }
    if (index === 1) { // abort
      throw new Error('configuration modified');
    }
  }

  return Promise.resolve();
};

const postUploadByXml = async (docId, localXml) => {
  const hashesDir = `${environment.pathToProject}/.hashes`;
  if (!fs.exists(hashesDir)){
    fs.mkdir(hashesDir);
  }

  let hashes = {};

  const hashesFile = `${hashesDir}/${docId}.json`;
  if (fs.exists(hashesFile)) {
    Object.assign(hashes, JSON.parse(fs.read(hashesFile).trim()));
  }
  hashes[getRevsAndHashesDocKey()] = crypto.createHash('md5').update(localXml, 'binary').digest('base64');

  fs.write(hashesFile, JSON.stringify(hashes));

  return Promise.resolve();
};

module.exports = {
  preUploadByRev, 
  postUploadByRev,
  preUploadByXml,
  postUploadByXml
};