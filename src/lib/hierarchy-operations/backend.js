const _ = require('lodash');
const lineageManipulation = require('./lineage-manipulation');

const HIERARCHY_ROOT = 'root';
const BATCH_SIZE = 10000;

const fetch = {
  /*
  Fetches all of the documents associated with the "contactIds" and confirms they exist.
  */
  contactList: async (db, ids) => {
    const contactDocs = await db.allDocs({
      keys: ids,
      include_docs: true,
    });

    const missingContactErrors = contactDocs.rows.filter(row => !row.doc).map(row => `Contact with id '${row.key}' could not be found.`);
    if (missingContactErrors.length > 0) {
      throw Error(missingContactErrors);
    }

    return contactDocs.rows.reduce((agg, curr) => Object.assign(agg, { [curr.doc._id]: curr.doc }), {});
  },

  contact: async (db, id) => {
    try {
      if (id === HIERARCHY_ROOT) {
        return undefined;
      }

      return await db.get(id);
    } catch (err) {
      if (err.name !== 'not_found') {
        throw err;
      }

      throw Error(`Contact with id '${id}' could not be found`);
    }
  },

  /*
  Given a contact's id, obtain the documents of all descendant contacts
  */
  descendantsOf: async (db, contactId) => {
    const descendantDocs = await db.query('medic/contacts_by_depth', {
      key: [contactId],
      include_docs: true,
    });

    return descendantDocs.rows
      .map(row => row.doc)
      /* We should not move or update tombstone documents */
      .filter(doc => doc && doc.type !== 'tombstone');
  },

  reportsCreatedByOrAt: async (db, createdByIds, createdAtId, skip) => {
    const createdByKeys = createdByIds.map(descendantId => [`contact:${descendantId}`]);
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

    return _.uniqBy(reports.rows.map(row => row.doc), '_id');
  },

  ancestorsOf: async (db, contactDoc) => {
    const ancestorIds = lineageManipulation.pluckIdsFromLineage(contactDoc.parent);
    const ancestors = await db.allDocs({
      keys: ancestorIds,
      include_docs: true,
    });

    const ancestorIdsNotFound = ancestors.rows.filter(ancestor => !ancestor.doc).map(ancestor => ancestor.key);
    if (ancestorIdsNotFound.length > 0) {
      throw Error(`Contact '${prettyPrintDocument(contactDoc)} has parent id(s) '${ancestorIdsNotFound.join(',')}' which could not be found.`);
    }

    return ancestors.rows.map(ancestor => ancestor.doc);
  },
};

module.exports = {
  HIERARCHY_ROOT,
  BATCH_SIZE,
  fetch,
};
