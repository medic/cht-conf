const lineageManipulation = require('./lineage-manipulation');
const LineageConstraints = require('./lineage-constraints');
const { trace, info } = require('../log');

const JsDocs = require('./jsdocFolder');
const Backend = require('./backend');

const HierarchyOperations = (db, options) => {
  async function move(sourceIds, destinationId) {
    JsDocs.prepareFolder(options);
    trace(`Fetching contact details: ${destinationId}`);
    const constraints = await LineageConstraints(db, options);
    const destinationDoc = await Backend.contact(db, destinationId);
    const sourceDocs = await Backend.contactList(db, sourceIds);
    constraints.assertHierarchyErrors(Object.values(sourceDocs), destinationDoc);

    let affectedContactCount = 0, affectedReportCount = 0;
    const replacementLineage = lineageManipulation.createLineageFromDoc(destinationDoc);
    for (let sourceId of sourceIds) {
      const sourceDoc = sourceDocs[sourceId];
      const descendantsAndSelf = await Backend.descendantsOf(db, sourceId);

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
      const updatedDescendants = replaceLineageInContacts(descendantsAndSelf, replacementLineage, sourceId);
      
      const ancestors = await Backend.ancestorsOf(db, sourceDoc);
      trace(`Considering primary contact updates to ${ancestors.length} ancestor(s) of contact ${prettyPrintDocument(sourceDoc)}.`);
      const updatedAncestors = replaceLineageInAncestors(descendantsAndSelf, ancestors);
      
      minifyLineageAndWriteToDisk([...updatedDescendants, ...updatedAncestors]);
      
      const movedReportsCount = await moveReports(descendantsAndSelf, replacementLineage, sourceId, destinationId);
      trace(`${movedReportsCount} report(s) created by these affected contact(s) will be updated`);

      affectedContactCount += updatedDescendants.length + updatedAncestors.length;
      affectedReportCount += movedReportsCount;

      info(`Staged updates to ${prettyPrintDocument(sourceDoc)}. ${updatedDescendants.length} contact(s) and ${movedReportsCount} report(s).`);
    }

    info(`Staged changes to lineage information for ${affectedContactCount} contact(s) and ${affectedReportCount} report(s).`);
  }

  async function moveReports(descendantsAndSelf, replacementLineage, sourceId, destinationId) {
    const descendantIds = descendantsAndSelf.map(contact => contact._id);

    let skip = 0;
    let reportDocsBatch;
    do {
      info(`Processing ${skip} to ${skip + Backend.BATCH_SIZE} report docs`);
      const createdAtId = options.merge && sourceId;
      reportDocsBatch = await Backend.reportsCreatedByOrAt(db, descendantIds, createdAtId, skip);

      const updatedReports = replaceLineageInReports(reportDocsBatch, replacementLineage, sourceId);

      if (options.merge) {
        reassignReports(reportDocsBatch, sourceId, destinationId, updatedReports);
      }

      minifyLineageAndWriteToDisk(updatedReports);

      skip += reportDocsBatch.length;
    } while (reportDocsBatch.length >= Backend.BATCH_SIZE);

    return skip;
  }

  function reassignReports(reports, sourceId, destinationId, updatedReports) {
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

  function minifyLineageAndWriteToDisk(docs) {
    docs.forEach(doc => {
      lineageManipulation.minifyLineagesInDoc(doc);
      JsDocs.writeDoc(options, doc);
    });
  }

  function replaceLineageInReports(reportsCreatedByDescendants, replaceWith, startingFromIdInLineage) {
    return reportsCreatedByDescendants.reduce((agg, doc) => {
      if (lineageManipulation.replaceLineage(doc, 'contact', replaceWith, startingFromIdInLineage, options)) {
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

  function replaceLineageInContacts(descendantsAndSelf, replacementLineage, destinationId) {
    function replaceForSingleContact(doc) {
      const docIsDestination = doc._id === destinationId;
      const startingFromIdInLineage = options.merge || !docIsDestination ? destinationId : undefined;
      const parentWasUpdated = lineageManipulation.replaceLineage(doc, 'parent', replacementLineage, startingFromIdInLineage, options);
      const contactWasUpdated = lineageManipulation.replaceLineage(doc, 'contact', replacementLineage, destinationId, options);
      const isUpdated = parentWasUpdated || contactWasUpdated;
      if (isUpdated) {
        result.push(doc);
      }
    }
    
    const result = [];
    for (const doc of descendantsAndSelf) {
      const docIsDestination = doc._id === destinationId;
      
      // skip top-level because it will be deleted
      if (options.merge && docIsDestination) {
        continue;
      }

      replaceForSingleContact(doc);
    }

    return result;
  }

  return { move };
};

module.exports = (db, options) => ({
  HIERARCHY_ROOT: Backend.HIERARCHY_ROOT,
  move: HierarchyOperations(db, { ...options, merge: false }).move,
  merge: HierarchyOperations(db, { ...options, merge: true }).move,
});

