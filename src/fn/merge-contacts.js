const minimist = require('minimist');
const path = require('path');

const environment = require('../lib/environment');
const lineageManipulation = require('../lib/lineage-manipulation');
const lineageConstraints = require('../lib/lineage-constraints');
const pouch = require('../lib/db');
const { trace, info } = require('../lib/log');

const Shared = require('../lib/mm-shared');

module.exports = {
  requiresInstance: true,
  execute: () => {
    const args = parseExtraArgs(environment.pathToProject, environment.extraArgs);
    const db = pouch();
    Shared.prepareDocumentDirectory(args);
    return mergeContacts(args, db);
  }
};

const mergeContacts = async (options, db) => {
  trace(`Fetching contact details: ${options.keptId}`);
  const keptDoc = await Shared.fetch.contact(db, options.keptId);

  const constraints = await lineageConstraints(db, keptDoc);
  const removedDocs = await Shared.fetch.contactList(db, options.removedIds);
  await validateContacts(removedDocs, constraints);

  let affectedContactCount = 0, affectedReportCount = 0;
  const replacementLineage = lineageManipulation.createLineageFromDoc(keptDoc);
  for (let removedId of options.removedIds) {
    const contactDoc = removedDocs[removedId];
    const descendantsAndSelf = await Shared.fetch.descendantsOf(db, removedId);

    const self = descendantsAndSelf.find(d => d._id === removedId);
    Shared.writeDocumentToDisk(options, {
      _id: self._id,
      _rev: self._rev,
      _deleted: true,
    });

    const prettyPrintDocument = doc => `'${doc.name}' (${doc._id})`;
    // Check that primary contact is not removed from areas where they are required
    const invalidPrimaryContactDoc = await constraints.getPrimaryContactViolations(contactDoc, descendantsAndSelf);
    if (invalidPrimaryContactDoc) {
      throw Error(`Cannot remove contact ${prettyPrintDocument(invalidPrimaryContactDoc)} from the hierarchy for which they are a primary contact.`);
    }

    trace(`Considering lineage updates to ${descendantsAndSelf.length} descendant(s) of contact ${prettyPrintDocument(contactDoc)}.`);
    const updatedDescendants = replaceLineageInContacts(descendantsAndSelf, replacementLineage, removedId);

    const ancestors = await Shared.fetch.ancestorsOf(db, contactDoc);
    trace(`Considering primary contact updates to ${ancestors.length} ancestor(s) of contact ${prettyPrintDocument(contactDoc)}.`);
    const updatedAncestors = Shared.replaceLineageInAncestors(descendantsAndSelf, ancestors);

    minifyLineageAndWriteToDisk([...updatedDescendants, ...updatedAncestors], options);

    const movedReportsCount = await moveReportsAndReassign(db, descendantsAndSelf, options, replacementLineage, removedId);
    trace(`${movedReportsCount} report(s) created by these affected contact(s) will be updated`);

    affectedContactCount += updatedDescendants.length + updatedAncestors.length;
    affectedReportCount += movedReportsCount;

    info(`Staged updates to ${prettyPrintDocument(contactDoc)}. ${updatedDescendants.length} contact(s) and ${movedReportsCount} report(s).`);
  }

  info(`Staged changes to lineage information for ${affectedContactCount} contact(s) and ${affectedReportCount} report(s).`);
};

/*
Checks for any errors which this will create in the hierarchy (hierarchy schema, circular hierarchies)
Confirms the list of contacts are possible to move
*/
const validateContacts = async (removedDocs, constraints) => {
  Object.values(removedDocs).forEach(doc => {
    const hierarchyError = constraints.getMergeContactHierarchyViolations(doc);
    if (hierarchyError) {
      throw Error(`Hierarchy Constraints: ${hierarchyError}`);
    }
  });
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });

  const removedIds = (args.removed || '')
    .split(',')
    .filter(Boolean);

  if (!args.kept) {
    usage();
    throw Error(`Action "merge-contacts" is missing required contact ID ${Shared.bold('--kept')}. Other contacts will be merged into this contact.`);
  }

  if (removedIds.length === 0) {
    usage();
    throw Error(`Action "merge-contacts" is missing required contact ID(s) ${Shared.bold('--removed')}. These contacts will be merged into the contact specified by ${Shared.bold('--kept')}`);
  }

  return {
    keptId: args.kept,
    removedIds,
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
    force: !!args.force,
  };
};

const usage = () => {
  info(`
${Shared.bold('cht-conf\'s merge-contacts action')}
When combined with 'upload-docs' this action merges multiple contacts and all their associated data into one.

${Shared.bold('USAGE')}
cht --local merge-contacts -- --kept=<kept_id> --removed=<removed_id1>,<removed_id2>

${Shared.bold('OPTIONS')}
--kept=<kept_id>
  Specifies the ID of the contact that should have all other contact data merged into it.

--removed=<removed_id1>,<removed_id2>
  A comma delimited list of IDs of contacts which will be deleted and all of their data will be merged into the kept contact.

--docDirectoryPath=<path to stage docs>
  Specifies the folder used to store the documents representing the changes in hierarchy.
`);
};

const moveReportsAndReassign = async (db, descendantsAndSelf, writeOptions, replacementLineage, removedId) => {
  const descendantIds = descendantsAndSelf.map(contact => contact._id);
  const keptId = writeOptions.keptId;

  let skip = 0;
  let reportDocsBatch;
  do {
    info(`Processing ${skip} to ${skip + Shared.BATCH_SIZE} report docs`);
    reportDocsBatch = await Shared.fetch.reportsCreatedByOrFor(db, descendantIds, removedId, skip);

    const updatedReports = replaceLineageInReports(reportDocsBatch, replacementLineage, removedId);

    reportDocsBatch.forEach(report => {
      let updated = false;
      const subjectIds = ['patient_id', 'patient_uuid', 'place_id', 'place_uuid'];
      for (const subjectId of subjectIds) {
        if (report[subjectId] === removedId) {
          report[subjectId] = keptId;
          updated = true;
        } 

        if (report.fields[subjectId] === removedId) {
          report.fields[subjectId] = keptId;
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

    minifyLineageAndWriteToDisk(updatedReports, writeOptions);

    skip += reportDocsBatch.length;
  } while (reportDocsBatch.length >= Shared.BATCH_SIZE);

  return skip;
};

// Shared?
const replaceLineageInReports = (reportsCreatedByDescendants, replaceWith, startingFromIdInLineage) => reportsCreatedByDescendants.reduce((agg, doc) => {
  if (lineageManipulation.replaceLineageAt(doc, 'contact', replaceWith, startingFromIdInLineage)) {
    agg.push(doc);
  }
  return agg;
}, []);

const minifyLineageAndWriteToDisk = (docs, parsedArgs) => {
  docs.forEach(doc => {
    lineageManipulation.minifyLineagesInDoc(doc);
    Shared.writeDocumentToDisk(parsedArgs, doc);
  });
};

const replaceLineageInContacts = (descendantsAndSelf, replacementLineage, contactId) => descendantsAndSelf.reduce((agg, doc) => {
  // skip top-level because it is now being deleted
  if (doc._id === contactId) {
    return agg;
  }

  const parentWasUpdated = lineageManipulation.replaceLineageAt(doc, 'parent', replacementLineage, contactId);
  const contactWasUpdated = lineageManipulation.replaceLineageAt(doc, 'contact', replacementLineage, contactId);
  if (parentWasUpdated || contactWasUpdated) {
    agg.push(doc);
  }
  return agg;
}, []);
