const lineageManipulation = require('./lineage-manipulation');

const HIERARCHY_ROOT = 'root';
const BATCH_SIZE = 10000;

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
    /* We should not move or update tombstone documents */
    .filter(doc => doc && doc.type !== 'tombstone');
}

async function getReportsForContacts(db, createdByIds, createdAtId, skip) {
  const createdByKeys = createdByIds.map(id => [`contact:${id}`]);
  const createdAtKeys = createdAtId ? [
    [`patient_id:${createdAtId}`],
    [`patient_uuid:${createdAtId}`],
    [`place_id:${createdAtId}`],
    [`place_uuid:${createdAtId}`]
  ] : [];

  const reports = await db.query('medic-client/reports_by_freetext', {
    keys: [
      ...createdByKeys,
      ...createdAtKeys,
    ],
    include_docs: true,
    limit: BATCH_SIZE,
    skip,
  });

  const docsWithId = reports.rows.map(({ doc }) => [doc._id, doc]);
  return Array.from(new Map(docsWithId).values());
}

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
  HIERARCHY_ROOT,
  BATCH_SIZE,
  getAncestorsOf,
  getContactWithDescendants,
  getContact,
  getContactsByIds,
  getReportsForContacts,
};
