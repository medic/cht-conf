const path = require('path');

const userPrompt = require('./user-prompt');
const fs = require('./sync-fs');
const { warn, trace } = require('./log');
const lineageManipulation = require('./lineage-manipulation');

const HIERARCHY_ROOT = 'root';
const BATCH_SIZE = 10000;

const prettyPrintDocument = doc => `'${doc.name}' (${doc._id})`;

const prepareDocumentDirectory = ({ docDirectoryPath, force }) => {
  if (!fs.exists(docDirectoryPath)) {
    fs.mkdir(docDirectoryPath);
  } else if (!force && fs.recurseFiles(docDirectoryPath).length > 0) {
    warn(`The document folder '${docDirectoryPath}' already contains files. It is recommended you start with a clean folder. Do you want to delete the contents of this folder and continue?`);
    if(userPrompt.keyInYN()) {
      fs.deleteFilesInFolder(docDirectoryPath);
    } else {
      throw new Error('User aborted execution.');
    }
  }
};

const writeDocumentToDisk = ({ docDirectoryPath }, doc) => {
  const destinationPath = path.join(docDirectoryPath, `${doc._id}.doc.json`);
  if (fs.exists(destinationPath)) {
    warn(`File at ${destinationPath} already exists and is being overwritten.`);
  }

  trace(`Writing updated document to ${destinationPath}`);
  fs.writeJson(destinationPath, doc);
};

const replaceLineageInAncestors = (descendantsAndSelf, ancestors) => ancestors.reduce((agg, ancestor) => {
  let result = agg;
  const primaryContact = descendantsAndSelf.find(descendant => ancestor.contact && descendant._id === ancestor.contact._id);
  if (primaryContact) {
    ancestor.contact = lineageManipulation.createLineageFromDoc(primaryContact);
    result = [ancestor, ...result];
  }

  return result;
}, []);


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

  reportsCreatedBy: async (db, contactIds, skip) => {
    const reports = await db.query('medic-client/reports_by_freetext', {
      keys: contactIds.map(id => [`contact:${id}`]),
      include_docs: true,
      limit: BATCH_SIZE,
      skip,
    });

    return reports.rows.map(row => row.doc);
  },

  reportsCreatedFor: async (db, contactId, skip) => {
    // TODO is this the right way?
    const reports = await db.query('medic-client/reports_by_freetext', {
      keys: [
        [`patient_id:${contactId}`],
        [`patient_uuid:${contactId}`],
        [`place_id:${contactId}`],
        [`place_uuid:${contactId}`],
      ],
      include_docs: true,
      limit: BATCH_SIZE,
      skip,
    });

    return reports.rows.map(row => row.doc);
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

const bold = text => `\x1b[1m${text}\x1b[0m`;

module.exports = {
  HIERARCHY_ROOT,
  BATCH_SIZE,
  bold,
  prepareDocumentDirectory,
  prettyPrintDocument,
  minifyLineageAndWriteToDisk, 
  replaceLineageInAncestors,
  writeDocumentToDisk,
  fetch,
};
