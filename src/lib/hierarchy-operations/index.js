const DataSource = require('./hierarchy-data-source');
const deleteHierarchy = require('./delete-hierarchy');
const JsDocs = require('./jsdocFolder');
const lineageManipulation = require('./lineage-manipulation');
const LineageConstraints = require('./lineage-constraints');
const { trace, info } = require('../log');

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
      mergePrimaryContacts: !!options.mergePrimaryContacts,
      sourcePrimaryContactId: getPrimaryContactId(sourceDoc),
      destinationPrimaryContactId: getPrimaryContactId(destinationDoc),
    };

    const prettyPrintDocument = doc => `'${doc.name}' (${doc._id})`;
    await constraints.assertNoPrimaryContactViolations(sourceDoc, destinationDoc, descendantsAndSelf);

    trace(`Considering updates to ${descendantsAndSelf.length} descendant(s) of contact ${prettyPrintDocument(sourceDoc)}.`);
    const updatedDescendants = updateContacts(options, constraints, moveContext);
    
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

function getPrimaryContactId(doc) {
  return typeof doc?.contact === 'string' ? doc.contact : doc?.contact?._id;
}

async function updateReports(db, options, moveContext) {
  const descendantIds = moveContext.descendantsAndSelf.map(contact => contact._id);

  let skip = 0;
  let reportDocsBatch;
  do {
    info(`Processing ${skip} to ${skip + DataSource.BATCH_SIZE} report docs`);
    const createdAtIds = getReportsCreatedAtIds(moveContext);
    reportDocsBatch = await DataSource.getReportsForContacts(db, descendantIds, createdAtIds, skip);

    const lineageUpdates = replaceLineageOfReportCreator(reportDocsBatch, moveContext);
    const reassignUpdates = reassignReports(reportDocsBatch, moveContext);
    const updatedReports = reportDocsBatch.filter(doc => lineageUpdates.has(doc._id) || reassignUpdates.has(doc._id));

    minifyLineageAndWriteToDisk(options, updatedReports);

    skip += reportDocsBatch.length;
  } while (reportDocsBatch.length >= DataSource.BATCH_SIZE);

  return skip;
}

function getReportsCreatedAtIds(moveContext) {
  const result = [];
  if (moveContext.merge) {
    result.push(moveContext.sourceId);
  }

  if (moveContext.mergePrimaryContacts && moveContext.sourcePrimaryContactId) {
    result.push(moveContext.sourcePrimaryContactId);
  }

  return result;
}

function reassignReportSubjects(report, moveContext) {
  let updated = false;
  for (const subjectId of DataSource.SUBJECT_IDS) {
    updated |= reassignSingleReport(report, subjectId, moveContext.sourceId, moveContext.destinationId);

    if (moveContext.mergePrimaryContacts && moveContext.sourcePrimaryContactId && moveContext.destinationPrimaryContactId) {
      updated |= reassignSingleReport(report, subjectId, moveContext.sourcePrimaryContactId, moveContext.destinationPrimaryContactId);
    }
  }
  
  return updated;
}

function reassignSingleReport(report, subjectId, matchId, resultingId) {
  let result = false;
  if (report[subjectId] === matchId) {
    report[subjectId] = resultingId;
    result = true;
  }

  if (report.fields[subjectId] === matchId) {
    report.fields[subjectId] = resultingId;
    result = true;
  }

  return result;
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
    
  const updates = new Set();
  reports.forEach(doc => {
    if (replaceContactLineage(doc)) {
      updates.add(doc._id);
    }
  });

  return updates;
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
  const docIsSource = doc._id === moveContext.sourceId;
  const startingFromId = moveContext.merge || !docIsSource ? moveContext.sourceId : undefined;
  const replaceLineageOptions = {
    replaceWith: moveContext.replacementLineage,
    startingFromId,
    merge: moveContext.merge,
  };
  const parentWasUpdated = lineageManipulation.replaceParentLineage(doc, replaceLineageOptions);

  replaceLineageOptions.startingFromId = moveContext.sourceId;
  const contactWasUpdated = lineageManipulation.replaceContactLineage(doc, replaceLineageOptions);
  if (parentWasUpdated || contactWasUpdated) {
    return doc;
  }
}

function updateContacts(options, constraints, moveContext) {
  return moveContext.descendantsAndSelf
    .map(descendant => {
      const toDelete = (moveContext.merge && descendant._id === moveContext.sourceId) || 
        (moveContext.mergePrimaryContacts && descendant._id === moveContext.sourcePrimaryContactId);

      if (toDelete) {
        const toDeleteUsers = options.disableUsers && constraints.isPlace(descendant);
        return {
          _id: descendant._id,
          _rev: descendant._rev,
          _deleted: true,
          disableUsers: !!toDeleteUsers,
        };
      }

      return replaceLineageInSingleContact(descendant, moveContext);
    })
    .filter(Boolean);
}

module.exports = (db, options = {}) => {
  return {
    HIERARCHY_ROOT: DataSource.HIERARCHY_ROOT,
    move: (sourceIds, destinationId) => moveHierarchy(db, { ...options, merge: false }, sourceIds, destinationId),
    merge: (sourceIds, destinationId) => moveHierarchy(db, { ...options, merge: true }, sourceIds, destinationId),
    delete: async (sourceIds) => deleteHierarchy(db, options, sourceIds),
  };
};
