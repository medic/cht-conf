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

const getEnvironmentKey = () => {
  const parsed = url.parse(environment.apiUrl);
  const key = `${parsed.hostname}${parsed.pathname || 'medic'}`;
  return key;
};

const getBookmarksDir = () => path.join(environment.pathToProject, '.bookmarks');

const getStoredHashes = () => {
  const bookmarksDir = getBookmarksDir();
  if (!fs.exists(bookmarksDir)) {
    fs.mkdir(bookmarksDir);
  }

  const filePath = path.join(bookmarksDir, 'hashes.json');
  if (fs.exists(filePath)) {
    try {
      return JSON.parse(fs.read(filePath).trim());
    } catch(e) {
      log.info('Error trying to read bookmark, continuing anyway', e);
    }
  }

  return {};
};

const getStoredHash = id => {
  const hashes = getStoredHashes();
  return hashes && hashes[id] && hashes[id][getEnvironmentKey()];
};

const updateStoredHash = (id, hash) => {
  const hashes = getStoredHashes();
  if (!hashes[id]) {
    hashes[id] = {};
  }
  hashes[id][getEnvironmentKey()] = hash;
  fs.write(path.join(getBookmarksDir(), 'hashes.json'), JSON.stringify(hashes));
};

const couchDigest = content => 'md5-' + crypto.createHash('md5').update(content, 'binary').digest('base64');

const getXFormAttachment = doc => {
  const name = Object
    .keys(doc && doc._attachments || {})
    .find(name => name === 'xml' || (name.endsWith('.xml') && name !== 'model.xml'));
  return name;
};

const getFormHash = (doc, xml) => {
  const xFormAttachmentName = getXFormAttachment(doc);
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
      if (name !== 'form.html' && name !== 'model.xml' && name !== xFormAttachmentName) {
        const attachment = doc._attachments[name];
        const digest = attachment.digest || couchDigest(attachment.data);
        crypt.update(digest, 'utf8');
      }
    });
  }
  return crypt.digest('base64');
};

const getDocHash = originalDoc => {
  const doc = JSON.parse(JSON.stringify(originalDoc)); // clone doc
  delete doc._rev;
  delete doc._attachments;
  const crypt = crypto.createHash('md5');
  crypt.update(JSON.stringify(doc), 'utf8');
  if (originalDoc._attachments) {
    Object.values(originalDoc._attachments).forEach(attachment => {
      crypt.update(attachment.digest || couchDigest(attachment.data), 'utf8');
    });
  }
  return crypt.digest('base64');
};

const preUploadDoc = async (db, localDoc) => {
  let remoteDoc;

  try {
    remoteDoc = await db.get(localDoc._id);
  } catch (e) {
    if (e.status === 404) {
      // The form doesn't exist on the server so we know we're not overwriting anything
      return Promise.resolve(true);
    } else {
      // Unexpected error, we report it then quit
      log.trace('Trying to fetch remote doc', e);
      throw new Error(`Unable to fetch doc with id ${localDoc._id}, returned status code = ${e.status}`);
    }
  }

  const remoteHash = getDocHash(remoteDoc);
  const localHash = getDocHash(localDoc);
  if (localHash === remoteHash) {
    // no changes to this form - do not upload
    return Promise.resolve(false);
  }

  const storedHash = getStoredHash(localDoc._id);
  if (storedHash === remoteHash) {
    // changes made locally based on common starting point - upload
    return Promise.resolve(true);
  }

  const diff = jsonDiff.diffString(remoteDoc, localDoc);

  if (diff) {
    let index = readline.keyInSelect(responseChoicesWithDiff, question, {cancel: false});
    if (index === 2) { // diff
      log.info(diff);
      index = readline.keyInSelect(responseChoicesWithoutDiff, question, {cancel: false});
    }
    if (index === 1) { // abort
      throw new Error('configuration modified');
    }
  } else {
    // attachments or properties updated - prompt for overwrite or abort
    const index = readline.keyInSelect(responseChoicesWithoutDiff, question, {cancel: false});
    if (index === 1) { // abort
      throw new Error('configuration modified');
    }
  }

  // user chose to overwrite remote form - upload
  return Promise.resolve(true);
};

const postUploadDoc = doc => updateStoredHash(doc._id, getDocHash(doc));

const preUploadForm = async (db, localDoc, localXml) => {

  let remoteXml;
  let remoteHash;
  try {
    const remoteDoc = await db.get(localDoc._id);
    const attachmentName = getXFormAttachment(remoteDoc);
    if (!attachmentName) {
      // does not exist so ok to overwrite
      return Promise.resolve(true);
    }
    const buffer = await db.getAttachment(localDoc._id, attachmentName);
    remoteXml = buffer.toString('utf8');
    remoteHash = getFormHash(remoteDoc, remoteXml);
  } catch (e) {
    if (e.status === 404) {
      // The form doesn't exist on the server so we know we're not overwriting anything
      return Promise.resolve(true);
    } else {
      // Unexpected error, we report it then quit
      log.trace('Trying to fetch remote xml', e);
      throw new Error(`Unable to fetch xml attachment of doc with id ${localDoc._id}, returned status code = ${e.status}`);
    }
  }

  const localHash = getFormHash(localDoc, localXml);
  if (localHash === remoteHash) {
    // no changes to this form - do not upload
    return Promise.resolve(false);
  }

  const storedHash = getStoredHash(localDoc._id);
  if (storedHash === remoteHash) {
    // changes made locally based on common starting point - upload
    return Promise.resolve(true);
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
  return Promise.resolve(true);
};

const postUploadForm = (doc, xml) => updateStoredHash(doc._id, getFormHash(doc, xml));

module.exports = {
  preUploadDoc,
  postUploadDoc,
  preUploadForm,
  postUploadForm
};
