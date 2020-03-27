const fs = require('./sync-fs');
const jsonDiff = require('json-diff');
const readline = require('readline-sync');
const crypto = require('crypto');
const url = require('url');
const path = require('path');
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

const getBookmarksDir = () => path.join(environment.pathToProject, '.bookmarks');

const getBookmark = fileName => {
  const bookmarksDir = getBookmarksDir();
  if (!fs.exists(bookmarksDir)) {
    fs.mkdir(bookmarksDir);
  }

  const filePath = path.join(bookmarksDir, fileName);
  if (fs.exists(filePath)) {
    try {
      return JSON.parse(fs.read(filePath).trim());
    } catch(e) {
      log.info('Error trying to read bookmark, continuing anyway', e);
    }
  }

  return {};
};

const getStoredRevs = () => getBookmark('hashes.json');
const getStoredHashes = () => getBookmark('revs.json');

const getStoredRev = id => {
  const revs = getStoredRevs();
  return revs && revs[id] && revs[id][getRevsAndHashesDocKey()];
};

const getStoredHash = id => {
  const hashes = getStoredHashes();
  return hashes && hashes[id] && hashes[id][getRevsAndHashesDocKey()];
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

  const localRev = getStoredRev(localDoc._id);

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
  const localRevs = getStoredRevs();
  if (!localRevs[doc._id]) {
    localRevs[doc._id] = {};
  }
  localRevs[doc._id][getRevsAndHashesDocKey()] = remoteDoc._rev;
  fs.write(path.join(getBookmarksDir(), 'revs.json'), JSON.stringify(localRevs));
  return doc;
};

const getXFormAttachment = doc => {
  const name = Object
    .keys(doc && doc._attachments || {})
    .find(name => name === 'xml' || (name.endsWith('.xml') && name !== 'model.xml'));
  return name;
};

const getFormHash = (doc, xml) => {
  const crypt = crypto.createHash('md5');
  crypt.update(xml, 'utf8');
  const properties = {
    context: doc.context,
    icon: doc.icon,
    internalId: doc.internalId,
    title: doc.title
  };
  crypt.update(JSON.stringify(properties), 'utf8');
  if (doc._attachments) {
    Object.keys(doc._attachments).forEach(name => {
      if (name !== 'form.html' && name !== 'model.xml') {
        const attachment = doc._attachments[name];
        let digest = attachment.digest;
        if (!digest) {
          // locally generated - build the digest
          digest = 'md5-' + crypto.createHash('md5').update(attachment.data, 'binary').digest('base64');
        }
        crypt.update(digest, 'utf8');
      }
    });
  }
  return crypt.digest('base64');
};

const preUploadByXml = async (db, doc, localXml) => {

  let remoteXml;
  let remoteHash;
  try {
    const remoteDoc = await db.get(doc._id);
    const attachmentName = getXFormAttachment(remoteDoc);
    if (!attachmentName) {
      // does not exist so ok to overwrite
      return Promise.resolve();
    }
    const buffer = await db.getAttachment(doc._id, attachmentName);
    remoteXml = buffer.toString('utf8');
    remoteHash = getFormHash(remoteDoc, remoteXml);
  } catch (e) {
    if (e.status === 404) {
      // The form doesn't exist on the server so we know we're not overwriting anything
      return Promise.resolve();
    } else {
      // Unexpected error, we report it then quit
      log.trace('Trying to fetch remote xml', e);
      throw new Error(`Unable to fetch xml attachment of doc with id ${doc._id}, returned status code = ${e.status}`);
    }
  }

  const localHash = getFormHash(doc, localXml);
  if (localHash === remoteHash) {
    // no changes to this form - do not upload
    throw new Error('No changes');
  }

  const storedHash = getStoredHash(doc._id);
  if (storedHash === remoteHash) {
    // changes made locally based on common starting point - upload
    return Promise.resolve();
  }

  const localDom = new DOMParser().parseFromString(localXml);
  const remoteDom = new DOMParser().parseFromString(remoteXml);

  const diff = compare(localDom, remoteDom);
  const hasNoDiff = diff.getResult();
  if (hasNoDiff) {
    // attachments or properties updated - prompt for overwrite or abort
    const index = readline.keyInSelect(responseChoicesWithoutDiff, question, {cancel: false});
    if (index === 1) { // abort
      throw new Error('configuration modified');
    }
  } else {
    let index = readline.keyInSelect(responseChoicesWithDiff, question, {cancel: false});
    if (index === 2) { // diff
      log.info(GroupingReporter.report(diff));

      index = readline.keyInSelect(responseChoicesWithoutDiff, question, {cancel: false});
    }
    if (index === 1) { // abort
      throw new Error('configuration modified');
    }
  }

  // user chose to overwrite remote form - upload
  return Promise.resolve();
};

const postUploadByXml = async (doc, xml) => {
  const hashes = getStoredHashes();
  if (!hashes[doc._id]) {
    hashes[doc._id] = {};
  }
  hashes[doc._id][getRevsAndHashesDocKey()] = getFormHash(doc, xml);
  fs.write(path.join(getBookmarksDir(), 'hashes.json'), JSON.stringify(hashes));
  return Promise.resolve();
};

module.exports = {
  preUploadByRev, 
  postUploadByRev,
  preUploadByXml,
  postUploadByXml
};
