const lineageManipulation = require('./lineage-manipulation');
const {getValidApiVersion} = require('../get-api-version');
const semver = require('semver');
const api = require('../api');
const environment = require('../environment');

const HIERARCHY_ROOT = 'root';
const BATCH_SIZE = 10000;
// NOTE: this is the latest version at the time of writing this code
// probably need to change this with the actual version in which the
// nouveau code got shipped
const NOUVEAU_MIN_VERSION = '4.16.0';

/*
Fetches all of the documents associated with the "contactIds" and confirms they exist.
*/
async function getContactsByIds(db, ids) {
  const contactDocs = await db.allDocs({
    keys: ids,
    include_docs: true,
  });

  const missingContactErrors = contactDocs.rows.filter(row => !row.doc).map(row => `Contact with id '${row.key}' could not be found.`);
  if (missingContactErrors.length > 0) {
    throw Error(missingContactErrors);
  }

  const contactDict = {};
  contactDocs.rows.forEach(({ doc }) => contactDict[doc._id] = doc);
  return contactDict;
}

async function getContact(db, id) {
  try {
    if (id === HIERARCHY_ROOT) {
      return undefined;
    }

    return await db.get(id);
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }

    throw Error(`Contact with id '${id}' could not be found`);
  }
}

/*
Given a contact's id, obtain the documents of all descendant contacts
*/
async function getContactWithDescendants(db, contactId) {
  const descendantDocs = await db.query('medic/contacts_by_depth', {
    key: [contactId],
    include_docs: true,
  });

  return descendantDocs.rows
    .map(row => row.doc)
    // We should not move or update tombstone documents
    // Not relevant for 4.x cht-core versions, but needed in older versions.
    .filter(doc => doc && doc.type !== 'tombstone');
}

const getReportsFromNouveauByCreatedByIds = async (createdByIds, skip) => {
  const queryString = createdByIds.map(id => `contact:"${id}"`).join(' OR ');
  const api_ = api();
  const res = await api_.request.get(`${environment.apiUrl}/_design/medic-nouveau/_nouveau/reports_by_freetext`, {
    qs: {
      q: queryString,
      include_docs: true,
      limit: BATCH_SIZE,
      skip
    }, json: true
  });
  return res.hits.map(item => item.doc);
};

const getFromDbView = async (db, view, keys, skip) => {
  const res = await db.query(view, {
    keys,
    include_docs: true,
    limit: BATCH_SIZE,
    skip
  });
  return res.rows.map(row => row.doc);
};

const fetchReportsByCreator = async (db, createdByIds, skip) => {
  if (createdByIds.length === 0) {
    return [];
  }

  const coreVersion = await getValidApiVersion();
  if (coreVersion && semver.gt(coreVersion, NOUVEAU_MIN_VERSION)) {
    return await getReportsFromNouveauByCreatedByIds(createdByIds, skip);
  }

  const createdByKeys = createdByIds.map(id => [`contact:${id}`]);
  return await getFromDbView(db, 'medic-client/reports_by_freetext', createdByKeys, skip);
};

const fetchReportsBySubject = async (db, createdAtId, skip) => {
  if (!createdAtId) {
    return [];
  }
  return await getFromDbView(db, 'medic-client/reports_by_subject', [createdAtId], skip);
};

const getReportsForContacts = async (db, createdByIds, createdAtId, skip) => {
  const creatorReports = await fetchReportsByCreator(db, createdByIds, skip);
  const subjectReports = await fetchReportsBySubject(db, createdAtId, skip);

  const allRows = [...creatorReports, ...subjectReports];

  const docsWithId = allRows.map(( doc ) => [doc._id, doc]);
  return Array.from(new Map(docsWithId).values());
};

async function getAncestorsOf(db, contactDoc) {
  const ancestorIds = lineageManipulation.pluckIdsFromLineage(contactDoc.parent);
  const ancestors = await db.allDocs({
    keys: ancestorIds,
    include_docs: true,
  });

  const ancestorIdsNotFound = ancestors.rows.filter(ancestor => !ancestor.doc).map(ancestor => ancestor.key);
  if (ancestorIdsNotFound.length > 0) {
    throw Error(`Contact '${contactDoc?.name}' (${contactDoc?._id}) has parent id(s) '${ancestorIdsNotFound.join(',')}' which could not be found.`);
  }

  return ancestors.rows.map(ancestor => ancestor.doc);
}

module.exports = {
  BATCH_SIZE,
  HIERARCHY_ROOT,
  getAncestorsOf,
  getContactWithDescendants,
  getContact,
  getContactsByIds,
  getReportsForContacts,
};
