const lineageManipulation = require('../lib/lineage-manipulation');
const lineageConstraints = require('../lib/lineage-constraints');
const { trace, info } = require('../lib/log');

const Shared = require('../lib/mm-shared');

module.exports = (options) => {
  const move = async (sourceIds, destinationId, db) => {
    Shared.prepareDocumentDirectory(options);
    trace(`Fetching contact details: ${destinationId}`);
    const destinationDoc = await Shared.fetch.contact(db, destinationId);

    const constraints = await lineageConstraints(db, destinationDoc, options);
    const sourceDocs = await Shared.fetch.contactList(db, sourceIds);
    await validateContacts(sourceDocs, constraints);

    let affectedContactCount = 0, affectedReportCount = 0;
    const replacementLineage = lineageManipulation.createLineageFromDoc(destinationDoc);
    for (let sourceId of sourceIds) {
      const sourceDoc = sourceDocs[sourceId];
      const descendantsAndSelf = await Shared.fetch.descendantsOf(db, sourceId);

      if (options.merge) {
        const self = descendantsAndSelf.find(d => d._id === sourceId);
        Shared.writeDocumentToDisk(options, {
          _id: self._id,
          _rev: self._rev,
          _deleted: true,
        });
      }

      const prettyPrintDocument = doc => `'${doc.name}' (${doc._id})`;
      // Check that primary contact is not removed from areas where they are required
      const invalidPrimaryContactDoc = await constraints.getPrimaryContactViolations(sourceDoc, descendantsAndSelf);
      if (invalidPrimaryContactDoc) {
        throw Error(`Cannot remove contact ${prettyPrintDocument(invalidPrimaryContactDoc)} from the hierarchy for which they are a primary contact.`);
      }

      trace(`Considering lineage updates to ${descendantsAndSelf.length} descendant(s) of contact ${prettyPrintDocument(sourceDoc)}.`);
      const updatedDescendants = replaceLineageInContacts(descendantsAndSelf, replacementLineage, sourceId);
      
      const ancestors = await Shared.fetch.ancestorsOf(db, sourceDoc);
      trace(`Considering primary contact updates to ${ancestors.length} ancestor(s) of contact ${prettyPrintDocument(sourceDoc)}.`);
      const updatedAncestors = Shared.replaceLineageInAncestors(descendantsAndSelf, ancestors);
      
      minifyLineageAndWriteToDisk([...updatedDescendants, ...updatedAncestors]);
      
      const movedReportsCount = await moveReports(db, descendantsAndSelf, replacementLineage, sourceId, destinationId);
      trace(`${movedReportsCount} report(s) created by these affected contact(s) will be updated`);

      affectedContactCount += updatedDescendants.length + updatedAncestors.length;
      affectedReportCount += movedReportsCount;

      info(`Staged updates to ${prettyPrintDocument(sourceDoc)}. ${updatedDescendants.length} contact(s) and ${movedReportsCount} report(s).`);
    }

    info(`Staged changes to lineage information for ${affectedContactCount} contact(s) and ${affectedReportCount} report(s).`);
  };

  /*
  Checks for any errors which this will create in the hierarchy (hierarchy schema, circular hierarchies)
  Confirms the list of contacts are possible to move
  */
  const validateContacts = async (sourceDocs, constraints) => {
    Object.values(sourceDocs).forEach(doc => {
      const hierarchyError = constraints.validate(doc);
      if (hierarchyError) {
        throw Error(`Hierarchy Constraints: ${hierarchyError}`);
      }
    });

    /*
    It is nice that the tool can move lists of contacts as one operation, but strange things happen when two contactIds are in the same lineage.
    For example, moving a district_hospital and moving a contact under that district_hospital to a new clinic causes multiple colliding writes to the same json file.
    */
    const contactIds = Object.keys(sourceDocs);
    Object.values(sourceDocs)
      .forEach(doc => {
        const parentIdsOfDoc = (doc.parent && lineageManipulation.pluckIdsFromLineage(doc.parent)) || [];
        const violatingParentId = parentIdsOfDoc.find(parentId => contactIds.includes(parentId));
        if (violatingParentId) {
          throw Error(`Unable to move two documents from the same lineage: '${doc._id}' and '${violatingParentId}'`);
        }
      });
  };

  const moveReports = async (db, descendantsAndSelf, replacementLineage, sourceId, destinationId) => {
    const descendantIds = descendantsAndSelf.map(contact => contact._id);

    let skip = 0;
    let reportDocsBatch;
    do {
      info(`Processing ${skip} to ${skip + Shared.BATCH_SIZE} report docs`);
      const createdAtId = options.merge && sourceId;
      reportDocsBatch = await Shared.fetch.reportsCreatedByOrAt(db, descendantIds, createdAtId, skip);

      const updatedReports = replaceLineageInReports(reportDocsBatch, replacementLineage, sourceId);

      if (options.merge) {
        reportDocsBatch.forEach(report => {
          let updated = false;
          const subjectIds = ['patient_id', 'patient_uuid', 'place_id', 'place_uuid'];
          for (const subjectId of subjectIds) {
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
        });
      }

      minifyLineageAndWriteToDisk(updatedReports);

      skip += reportDocsBatch.length;
    } while (reportDocsBatch.length >= Shared.BATCH_SIZE);

    return skip;
  };

  const minifyLineageAndWriteToDisk = (docs) => {
    docs.forEach(doc => {
      lineageManipulation.minifyLineagesInDoc(doc);
      Shared.writeDocumentToDisk(options, doc);
    });
  };

  const replaceLineageInReports = (reportsCreatedByDescendants, replaceWith, startingFromIdInLineage) => reportsCreatedByDescendants.reduce((agg, doc) => {
    const operation = options.merge ? lineageManipulation.replaceLineageAt : lineageManipulation.replaceLineageAfter;
    if (operation(doc, 'contact', replaceWith, startingFromIdInLineage)) {
      agg.push(doc);
    }
    return agg;
  }, []);

  const replaceLineageInContacts = (descendantsAndSelf, replacementLineage, destinationId) => descendantsAndSelf.reduce((agg, doc) => {
    const startingFromIdInLineage = options.merge ? destinationId : 
      doc._id === destinationId ? undefined : destinationId;
    
    // skip top-level because it will be deleted
    if (options.merge) {
      if (doc._id === destinationId) {
        return agg;
      }
    }

    const lineageOperation = options.merge ? lineageManipulation.replaceLineageAt : lineageManipulation.replaceLineageAfter;
    const parentWasUpdated = lineageOperation(doc, 'parent', replacementLineage, startingFromIdInLineage);
    const contactWasUpdated = lineageOperation(doc, 'contact', replacementLineage, destinationId);
    if (parentWasUpdated || contactWasUpdated) {
      agg.push(doc);
    }
    return agg;
  }, []);

  return { move };
};

