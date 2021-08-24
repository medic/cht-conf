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

  const missingDocumentErrors = documentDocs.rows.filter(row => !row.doc).map(row => `Document with id '${row.key}' could not be found.`);
  if (missingDocumentErrors && missingDocumentErrors.length) {
    throw Error(missingDocumentErrors);
  }

  const documentTypeErrors = documentDocs.rows.filter(row => !DOC_TYPES.includes(row.doc.type)).map(row => ` Document with id ${row.key} of type ${row.doc.type} cannot be edited`);
  if (documentTypeErrors && documentTypeErrors.length) {
    throw Error(documentTypeErrors);
  }

  return documentDocs.rows.reduce((agg, curr) => Object.assign(agg, { [curr.doc._id]: curr.doc }), {});
};

module.exports = async (db, ids, args) => {
  if(args.updateOfflineDocs) {
    info('Loading offline doc(s)');
    const missingDocs = [];
    let docs = {};
    ids.forEach(id => {
      const docPath = jsonDocPath(args.docDirectoryPath, id);
      if(!fs.exists(docPath)) {
        missingDocs.push(id);
      } else {
        docs[id] = fs.readJson(docPath);
      }
    });
    if(missingDocs.length > 0) {
      const docsFromDB = await fetchDocumentListFromDB(db, missingDocs);
      Object.assign(docs, docsFromDB);
    }

    return docs;
  }
  return fetchDocumentListFromDB(db, ids);
};
