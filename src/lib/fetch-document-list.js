/* eslint-disable no-console */
const { info } = require('../lib/log');
const fs = require('../lib/sync-fs');
const DOC_TYPES = ['district_hospital', 'health_center', 'clinic', 'person', 'user', 'user-settings', 'contact'];

const jsonDocPath = (directoryPath, docID) => `${directoryPath}/${docID}.doc.json`;

const fetchDocumentListFromDB = async (db, ids) => {
  info('Downloading doc(s)...');
  const documentDocs = await db.allDocs({
    keys: ids,
    include_docs: true,
  });

  const errors =  { invalidDocType: [], docNotFound: [] };

  documentDocs.rows.forEach(row => {
    if (!row.doc) {
        errors.docNotFound.push(`Document with id '${row.key}' could not be found.`);
        return;
    }

    if (!DOC_TYPES.includes(row.doc.type)) {
      errors.invalidDocType.push(`Document with id ${row.key} of type ${row.doc.type} cannot be edited`);
    }
  });

  if (errors.docNotFound.length || errors.invalidDocType.length) {
    throw Error([...errors.docNotFound, ...errors.invalidDocType]);
  }

  return documentDocs.rows.reduce((agg, curr) => Object.assign(agg, { [curr.doc._id]: curr.doc }), {});
};

/**
 * Gets the docs associated with the provided IDs. It first checks if the docs are saved offline in the
 * provided directory and fetches them from the DB if they are not.
 */
module.exports = async (db, ids, args) => {
  if(args.updateOfflineDocs) {
    info('Loading offline doc(s)');
    const missingDocs = [];
    let docs = {};
    ids.forEach(id => {
      const docPath = jsonDocPath(args.docDirectoryPath, id);
      if (!fs.exists(docPath)) {
        missingDocs.push(id);
      } else {
        docs[id] = fs.readJson(docPath);
      }
    });
    if (missingDocs.length > 0) {
      const docsFromDB = await fetchDocumentListFromDB(db, missingDocs);
      Object.assign(docs, docsFromDB);
    }

    return docs;
  }
  return fetchDocumentListFromDB(db, ids);
};
