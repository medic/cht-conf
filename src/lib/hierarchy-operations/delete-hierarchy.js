const DataSource = require('./hierarchy-data-source');
const JsDocs = require('./jsdocFolder');
const lineageConstraints = require('./lineage-constraints');
const { trace, info } = require('../log');

const prettyPrintDocument = doc => `'${doc.name}' (${doc._id})`;
async function deleteHierarchy(db, options, sourceIds) {
  const sourceDocs = await DataSource.getContactsByIds(db, sourceIds);
  const constraints = await lineageConstraints(db, options);
  for (const sourceId of sourceIds) {
    const sourceDoc = sourceDocs[sourceId];
    trace(`Deleting descendants and reports under: ${prettyPrintDocument(sourceDoc)}`);
    const descendantsAndSelf = await DataSource.getContactWithDescendants(db, sourceId);

    let affectedReportCount = 0;
    for (const descendant of descendantsAndSelf) {
      const toDeleteUsers = options.disableUsers && constraints.isPlace(descendant);
      JsDocs.deleteDoc(options, descendant, toDeleteUsers);
      affectedReportCount += await deleteReportsForContact(db, options, descendant);
    }

    const affectedContactCount = descendantsAndSelf.length;
    
    info(`Staged updates to delete ${prettyPrintDocument(sourceDoc)}. ${affectedContactCount.length} contact(s) and ${affectedReportCount} report(s).`);
  }
}

async function deleteReportsForContact(db, options, contact) {
  let skip = 0;
  let reportBatch;
  do {
    reportBatch = await DataSource.getReportsForContacts(db, [], contact._id, skip);

    for (const report of reportBatch) {
      JsDocs.deleteDoc(options, report);
    }

    skip += reportBatch.length;
  } while (reportBatch.length >= DataSource.BATCH_SIZE);
  
  return skip;
}

module.exports = deleteHierarchy;
