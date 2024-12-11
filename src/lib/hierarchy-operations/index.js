const lineageManipulation = require('./lineage-manipulation');
const LineageConstraints = require('./lineage-constraints');
const { trace, info } = require('../log');

const JsDocs = require('./jsdocFolder');
const DataSource = require('./hierarchy-data-source');

async function moveHierarchy(db, options, sourceIds, destinationId) {
  JsDocs.prepareFolder(options);
  trace(`Fetching contact details: ${destinationId}`);
  const constraints = await LineageConstraints(db, options);
  const destinationDoc = await DataSource.getContact(db, destinationId);
  const sourceDocs = await DataSource.getContactsByIds(db, sourceIds);
  constraints.assertNoHierarchyErrors(Object.values(sourceDocs), destinationDoc);

  let affectedContactCount = 0;
  let affectedReportCount = 0;
  const replacementLineage = lineageManipulation.createLineageFromDoc(destinationDoc);
  for (const sourceId of sourceIds) {
    const sourceDoc = sourceDocs[sourceId];
    const descendantsAndSelf = await DataSource.getContactWithDescendants(db, sourceId);
    const moveContext = {
      sourceId,
      destinationId,
      descendantsAndSelf,
      replacementLineage,
      merge: !!options.merge,
    };

    if (options.merge) {
      JsDocs.writeDoc(options, {
        _id: sourceDoc._id,
        _rev: sourceDoc._rev,
        _deleted: true,
      });
    }

    const prettyPrintDocument = doc => `'${doc.name}' (${doc._id})`;
    await constraints.assertNoPrimaryContactViolations(sourceDoc, destinationDoc, descendantsAndSelf);

    trace(`Considering lineage updates to ${descendantsAndSelf.length} descendant(s) of contact ${prettyPrintDocument(sourceDoc)}.`);
    const updatedDescendants = replaceLineageInContacts(options, moveContext);
    
    const ancestors = await DataSource.getAncestorsOf(db, sourceDoc);
    trace(`Considering primary contact updates to ${ancestors.length} ancestor(s) of contact ${prettyPrintDocument(sourceDoc)}.`);
    const updatedAncestors = replaceLineageInAncestors(descendantsAndSelf, ancestors);
    
    minifyLineageAndWriteToDisk(options, [...updatedDescendants, ...updatedAncestors]);
    
    const movedReportsCount = await updateReports(db, options, moveContext);
    trace(`${movedReportsCount} report(s) created by these affected contact(s) will be updated`);

    affectedContactCount += updatedDescendants.length + updatedAncestors.length;
    affectedReportCount += movedReportsCount;

    info(`Staged updates to ${prettyPrintDocument(sourceDoc)}. ${updatedDescendants.length} contact(s) and ${movedReportsCount} report(s).`);
  }

  info(`Staged changes to lineage information for ${affectedContactCount} contact(s) and ${affectedReportCount} report(s).`);
}

async function updateReports(db, options, moveContext) {
  const descendantIds = moveContext.descendantsAndSelf.map(contact => contact._id);

  let skip = 0;
  let reportDocsBatch;
  do {
    info(`Processing ${skip} to ${skip + DataSource.BATCH_SIZE} report docs`);
    const createdAtId = options.merge && moveContext.sourceId;
    reportDocsBatch = await DataSource.getReportsForContacts(db, descendantIds, createdAtId, skip);

    const lineageUpdates = replaceLineageOfReportCreator(reportDocsBatch, moveContext);
    const reassignUpdates = reassignReports(reportDocsBatch, moveContext);
    const updatedReports = reportDocsBatch.filter(doc => lineageUpdates.has(doc._id) || reassignUpdates.has(doc._id));

    minifyLineageAndWriteToDisk(options, updatedReports);

    skip += reportDocsBatch.length;
  } while (reportDocsBatch.length >= DataSource.BATCH_SIZE);

  return skip;
}

function reassignReportSubjects(report, { sourceId, destinationId }) {
  const SUBJECT_IDS = ['patient_id', 'patient_uuid', 'place_id', 'place_uuid'];
  let updated = false;
  for (const subjectId of SUBJECT_IDS) {
    if (report[subjectId] === sourceId) {
      report[subjectId] = destinationId;
      updated = true;
    }

    if (report.fields[subjectId] === sourceId) {
      report.fields[subjectId] = destinationId;
      updated = true;
    }
  }
  
  return updated;
}

function reassignReports(reports, moveContext) {
  const updated = new Set();
  if (!moveContext.merge) {
    return updated;
  }

  for (const report of reports) {
    const isUpdated = reassignReportSubjects(report, moveContext);
    if (isUpdated) {
      updated.add(report._id);
    }
  }

  return updated;
}

// This ensures all documents written are fully minified. Some docs in CouchDB are not minified to start with.
function minifyLineageAndWriteToDisk(options, docs) {
  docs.forEach(doc => {
    lineageManipulation.minifyLineagesInDoc(doc);
    JsDocs.writeDoc(options, doc);
  });
}

function replaceLineageOfReportCreator(reports, moveContext) {
  const replaceContactLineage = doc => lineageManipulation.replaceContactLineage(doc, {
    replaceWith: moveContext.replacementLineage,
    startingFromId: moveContext.sourceId,
    merge: moveContext.merge,
  });
    
  const updatedReportIds = reports
    .filter(replaceContactLineage)
    .map(({ _id }) => _id);
  return new Set(updatedReportIds);
}

function replaceLineageInAncestors(descendantsAndSelf, ancestors) {
  const updatedAncestors = [];
  for (const ancestor of ancestors) {
    const primaryContact = descendantsAndSelf.find(descendant => descendant._id === ancestor.contact?._id);
    if (primaryContact) {
      ancestor.contact = lineageManipulation.createLineageFromDoc(primaryContact);
      updatedAncestors.unshift(ancestor);
    }
  }

  return updatedAncestors;
}

function replaceLineageInSingleContact(doc, moveContext) {
  const { sourceId } = moveContext;
  const docIsSource = doc._id === moveContext.sourceId;
  if (docIsSource && moveContext.merge) {
    return;
  }

  const startingFromId = moveContext.merge || !docIsSource ? sourceId : undefined;
  const replaceLineageOptions = {
    replaceWith: moveContext.replacementLineage,
    startingFromId,
    merge: moveContext.merge,
  };
  const parentWasUpdated = lineageManipulation.replaceParentLineage(doc, replaceLineageOptions);

  replaceLineageOptions.startingFromId = sourceId;
  const contactWasUpdated = lineageManipulation.replaceContactLineage(doc, replaceLineageOptions);
  if (parentWasUpdated || contactWasUpdated) {
    return doc;
  }
}

function replaceLineageInContacts(options, moveContext) {
  return moveContext.descendantsAndSelf
    .map(descendant => replaceLineageInSingleContact(descendant, moveContext))
    .filter(Boolean);
}

module.exports = (db, options) => {
  return {
    HIERARCHY_ROOT: DataSource.HIERARCHY_ROOT,
    move: (sourceIds, destinationId) => moveHierarchy(db, { ...options, merge: false }, sourceIds, destinationId),
    merge: (sourceIds, destinationId) => moveHierarchy(db, { ...options, merge: true }, sourceIds, destinationId),
  };
};

