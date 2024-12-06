const lineageManipulation = require('./lineage-manipulation');
const LineageConstraints = require('./lineage-constraints');
const { trace, info } = require('../log');

const JsDocs = require('./jsdocFolder');
const DataSource = require('./hierarchy-data-source');

function moveHierarchy(db, options) {
  return async function (sourceIds, destinationId) {
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
      
      const movedReportsCount = await moveReports(db, options, moveContext);
      trace(`${movedReportsCount} report(s) created by these affected contact(s) will be updated`);

      affectedContactCount += updatedDescendants.length + updatedAncestors.length;
      affectedReportCount += movedReportsCount;

      info(`Staged updates to ${prettyPrintDocument(sourceDoc)}. ${updatedDescendants.length} contact(s) and ${movedReportsCount} report(s).`);
    }

    info(`Staged changes to lineage information for ${affectedContactCount} contact(s) and ${affectedReportCount} report(s).`);
  };
}

async function moveReports(db, options, moveContext) {
  const descendantIds = moveContext.descendantsAndSelf.map(contact => contact._id);

  let skip = 0;
  let reportDocsBatch;
  do {
    info(`Processing ${skip} to ${skip + DataSource.BATCH_SIZE} report docs`);
    const createdAtId = options.merge && moveContext.sourceId;
    reportDocsBatch = await DataSource.getReportsForContacts(db, descendantIds, createdAtId, skip);

    const lineageUpdates = replaceLineageInReports(options, reportDocsBatch, moveContext);
    const reassignUpdates = reassignReports(options, reportDocsBatch, moveContext);
    const updatedReports = reportDocsBatch.filter(doc => lineageUpdates.has(doc._id) || reassignUpdates.has(doc._id));

    minifyLineageAndWriteToDisk(options, updatedReports);

    skip += reportDocsBatch.length;
  } while (reportDocsBatch.length >= DataSource.BATCH_SIZE);

  return skip;
}

function reassignReports(options, reports, { sourceId, destinationId }) {
  function reassignReportWithSubject(report, subjectId) {
    if (report[subjectId] === sourceId) {
      report[subjectId] = destinationId;
      updated.add(report._id);
    }

    if (report.fields[subjectId] === sourceId) {
      report.fields[subjectId] = destinationId;
      updated.add(report._id);
    }
  }

  const updated = new Set();
  if (!options.merge) {
    return updated;
  }

  for (const report of reports) {
    const subjectIds = ['patient_id', 'patient_uuid', 'place_id', 'place_uuid'];
    for (const subjectId of subjectIds) {
      reassignReportWithSubject(report, subjectId);
    }
  }

  return updated;
}

function minifyLineageAndWriteToDisk(options, docs) {
  docs.forEach(doc => {
    lineageManipulation.minifyLineagesInDoc(doc);
    JsDocs.writeDoc(options, doc);
  });
}

function replaceLineageInReports(options, reports, moveContext) {
  const replaceLineageOptions = {
    replaceWith: moveContext.replacementLineage,
    startingFromId: moveContext.sourceId,
    merge: options.merge,
    };
    
  const updates = new Set();
  reports.forEach(doc => {
    if (lineageManipulation.replaceContactLineage(doc, replaceLineageOptions)) {
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

function replaceLineageInContacts(options, moveContext) {
  const { sourceId } = moveContext;
  function replaceForSingleContact(doc) {
    const docIsDestination = doc._id === sourceId;
    const startingFromId = options.merge || !docIsDestination ? sourceId : undefined;
    const replaceLineageOptions = {
      replaceWith: moveContext.replacementLineage,
      startingFromId,
      merge: options.merge,
    };
    const parentWasUpdated = lineageManipulation.replaceParentLineage(doc, replaceLineageOptions);

    replaceLineageOptions.startingFromId = sourceId;
    const contactWasUpdated = lineageManipulation.replaceContactLineage(doc, replaceLineageOptions);
    if (parentWasUpdated || contactWasUpdated) {
      return doc;
    }
  }

  function sonarQubeComplexityFiveIsTooLow(doc) {
    const docIsSource = doc._id === sourceId;
    
    // skip source because it will be deleted
    if (!options.merge || !docIsSource) {
      return replaceForSingleContact(doc);
    }
  }

  const result = [];
  for (const doc of moveContext.descendantsAndSelf) {
    const updatedDoc = sonarQubeComplexityFiveIsTooLow(doc);
    if (updatedDoc) {
      result.push(updatedDoc);
    }
  }

  return result;
}

module.exports = (db, options) => {
  return {
    HIERARCHY_ROOT: DataSource.HIERARCHY_ROOT,
    move: moveHierarchy(db, { ...options, merge: false }),
    merge: moveHierarchy(db, { ...options, merge: true }),
  };
};

