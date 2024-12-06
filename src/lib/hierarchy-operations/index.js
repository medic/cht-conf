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
    constraints.assertHierarchyErrors(Object.values(sourceDocs), destinationDoc);

    let affectedContactCount = 0, affectedReportCount = 0;
    const replacementLineage = lineageManipulation.createLineageFromDoc(destinationDoc);
    for (let sourceId of sourceIds) {
      const sourceDoc = sourceDocs[sourceId];
      const descendantsAndSelf = await DataSource.descendantsOf(db, sourceId);
      const moveContext = {
        sourceId,
        destinationId,
        descendantsAndSelf,
        replacementLineage,
      };

      if (options.merge) {
        const self = descendantsAndSelf.find(d => d._id === sourceId);
        JsDocs.writeDoc(options, {
          _id: self._id,
          _rev: self._rev,
          _deleted: true,
        });
      }

      const prettyPrintDocument = doc => `'${doc.name}' (${doc._id})`;
      // Check that primary contact is not removed from areas where they are required
      const invalidPrimaryContactDoc = await constraints.getPrimaryContactViolations(sourceDoc, destinationDoc, descendantsAndSelf);
      if (invalidPrimaryContactDoc) {
        throw Error(`Cannot remove contact ${prettyPrintDocument(invalidPrimaryContactDoc)} from the hierarchy for which they are a primary contact.`);
      }

      trace(`Considering lineage updates to ${descendantsAndSelf.length} descendant(s) of contact ${prettyPrintDocument(sourceDoc)}.`);
      const updatedDescendants = replaceLineageInContacts(options, moveContext);
      
      const ancestors = await DataSource.ancestorsOf(db, sourceDoc);
      trace(`Considering primary contact updates to ${ancestors.length} ancestor(s) of contact ${prettyPrintDocument(sourceDoc)}.`);
      const updatedAncestors = replaceLineageInAncestors(descendantsAndSelf, ancestors);
      
      minifyLineageAndWriteToDisk(options, [...updatedDescendants, ...updatedAncestors]);
      
      const movedReportsCount = await moveReports(db, options, moveContext, destinationId);
      trace(`${movedReportsCount} report(s) created by these affected contact(s) will be updated`);

      affectedContactCount += updatedDescendants.length + updatedAncestors.length;
      affectedReportCount += movedReportsCount;

      info(`Staged updates to ${prettyPrintDocument(sourceDoc)}. ${updatedDescendants.length} contact(s) and ${movedReportsCount} report(s).`);
    }

    info(`Staged changes to lineage information for ${affectedContactCount} contact(s) and ${affectedReportCount} report(s).`);
  }
}

async function moveReports(db, options, moveContext) {
  const descendantIds = moveContext.descendantsAndSelf.map(contact => contact._id);

  let skip = 0;
  let reportDocsBatch;
  do {
    info(`Processing ${skip} to ${skip + DataSource.BATCH_SIZE} report docs`);
    const createdAtId = options.merge && moveContext.sourceId;
    reportDocsBatch = await DataSource.reportsCreatedByOrAt(db, descendantIds, createdAtId, skip);

    const updatedReports = replaceLineageInReports(options, reportDocsBatch, moveContext);

    if (options.merge) {
      reassignReports(reportDocsBatch, moveContext, updatedReports);
    }

    minifyLineageAndWriteToDisk(options, updatedReports);

    skip += reportDocsBatch.length;
  } while (reportDocsBatch.length >= DataSource.BATCH_SIZE);

  return skip;
}

function reassignReports(reports, { sourceId, destinationId }, updatedReports) {
  function reassignReportWithSubject(report, subjectId) {
    let updated = false;
    if (report[subjectId] === sourceId) {
      report[subjectId] = destinationId;
      updated = true;
    }

    if (report.fields[subjectId] === sourceId) {
      report.fields[subjectId] = destinationId;
      updated = true;
    }

    if (updated) {
      const isAlreadyUpdated = !!updatedReports.find(updated => updated._id === report._id);
      if (!isAlreadyUpdated) {
        updatedReports.push(report);
      }
    }
  }

  for (const report of reports) {
    const subjectIds = ['patient_id', 'patient_uuid', 'place_id', 'place_uuid'];
    for (const subjectId of subjectIds) {
      reassignReportWithSubject(report, subjectId);
    }
  }
}

function minifyLineageAndWriteToDisk(options, docs) {
  docs.forEach(doc => {
    lineageManipulation.minifyLineagesInDoc(doc);
    JsDocs.writeDoc(options, doc);
  });
}

function replaceLineageInReports(options, reportsCreatedByDescendants, moveContext) {
  return reportsCreatedByDescendants.reduce((agg, doc) => {
    const replaceLineageOptions = {
      lineageAttribute: 'contact',
      replaceWith: moveContext.replacementLineage,
      startingFromId: moveContext.sourceId,
      merge: options.merge,
    };

    if (lineageManipulation.replaceLineage(doc, replaceLineageOptions)) {
      agg.push(doc);
    }
    return agg;
  }, []);
}

function replaceLineageInAncestors(descendantsAndSelf, ancestors) {
  return ancestors.reduce((agg, ancestor) => {
    let result = agg;
    const primaryContact = descendantsAndSelf.find(descendant => ancestor.contact && descendant._id === ancestor.contact._id);
    if (primaryContact) {
      ancestor.contact = lineageManipulation.createLineageFromDoc(primaryContact);
      result = [ancestor, ...result];
    }
  
    return result;
  }, []);
}

function replaceLineageInContacts(options, moveContext) {
  const { sourceId } = moveContext;
  function replaceForSingleContact(doc) {
    const docIsDestination = doc._id === sourceId;
    const startingFromId = options.merge || !docIsDestination ? sourceId : undefined;
    const replaceLineageOptions = {
      lineageAttribute: 'parent',
      replaceWith: moveContext.replacementLineage,
      startingFromId,
      merge: options.merge,
    };
    const parentWasUpdated = lineageManipulation.replaceLineage(doc, replaceLineageOptions);

    replaceLineageOptions.lineageAttribute = 'contact';
    replaceLineageOptions.startingFromId = sourceId;
    const contactWasUpdated = lineageManipulation.replaceLineage(doc, replaceLineageOptions);
    const isUpdated = parentWasUpdated || contactWasUpdated;
    if (isUpdated) {
      result.push(doc);
    }
  }

  const result = [];
  for (const doc of moveContext.descendantsAndSelf) {
    const docIsDestination = doc._id === sourceId;
    
    // skip top-level because it will be deleted
    if (options.merge && docIsDestination) {
      continue;
    }

    replaceForSingleContact(doc);
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

