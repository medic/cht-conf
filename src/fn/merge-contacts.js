const minimist = require('minimist');
const path = require('path');

const environment = require('../lib/environment');
const lineageManipulation = require('../lib/lineage-manipulation');
const lineageConstraints = require('../lib/lineage-constraints');
const pouch = require('../lib/db');
const { trace, info } = require('../lib/log');

const {
  BATCH_SIZE,
  prepareDocumentDirectory,
  prettyPrintDocument,
  replaceLineageInAncestors,
  bold,
  writeDocumentToDisk,
  fetch,
} = require('../lib/mm-shared');

module.exports = {
  requiresInstance: true,
  execute: () => {
    const args = parseExtraArgs(environment.pathToProject, environment.extraArgs);
    const db = pouch();
    prepareDocumentDirectory(args);
    return updateLineagesAndStage(args, db);
  }
};

const updateLineagesAndStage = async (options, db) => {
  trace(`Fetching contact details: ${options.winnerId}`);
  const winnerDoc = await fetch.contact(db, options.winnerId);

  const constraints = await lineageConstraints(db, winnerDoc);
  const loserDocs = await fetch.contactList(db, options.loserIds);
  await validateContacts(loserDocs, constraints);

  let affectedContactCount = 0, affectedReportCount = 0;
  const replacementLineage = lineageManipulation.createLineageFromDoc(winnerDoc);
  for (let loserId of options.loserIds) {
    const contactDoc = loserDocs[loserId];
    const descendantsAndSelf = await fetch.descendantsOf(db, loserId);

    const self = descendantsAndSelf.find(d => d._id === loserId);
    writeDocumentToDisk(options, {
      _id: self._id,
      _rev: self._rev,
      _deleted: true,
    });

    // Check that primary contact is not removed from areas where they are required
    const invalidPrimaryContactDoc = await constraints.getPrimaryContactViolations(contactDoc, descendantsAndSelf);
    if (invalidPrimaryContactDoc) {
      throw Error(`Cannot remove contact ${prettyPrintDocument(invalidPrimaryContactDoc)} from the hierarchy for which they are a primary contact.`);
    }

    trace(`Considering lineage updates to ${descendantsAndSelf.length} descendant(s) of contact ${prettyPrintDocument(contactDoc)}.`);
    const updatedDescendants = replaceLineageInContacts(descendantsAndSelf, replacementLineage, loserId);

    const ancestors = await fetch.ancestorsOf(db, contactDoc);
    trace(`Considering primary contact updates to ${ancestors.length} ancestor(s) of contact ${prettyPrintDocument(contactDoc)}.`);
    const updatedAncestors = replaceLineageInAncestors(descendantsAndSelf, ancestors);

    minifyLineageAndWriteToDisk([...updatedDescendants, ...updatedAncestors], options);

    const movedReportsCount = await moveReports(db, descendantsAndSelf, options, options.winnerId, loserId);
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
const validateContacts = async (contactDocs, constraints) => {
  Object.values(contactDocs).forEach(doc => {
    const hierarchyError = constraints.getHierarchyErrors(doc);
    if (hierarchyError) {
      throw Error(`Hierarchy Constraints: ${hierarchyError}`);
    }
  });

  /*
  It is nice that the tool can move lists of contacts as one operation, but strange things happen when two loserIds are in the same lineage.
  For example, moving a district_hospital and moving a contact under that district_hospital to a new clinic causes multiple colliding writes to the same json file.
  */
  const loserIds = Object.keys(contactDocs);
  Object.values(contactDocs)
    .forEach(doc => {
      const parentIdsOfDoc = (doc.parent && lineageManipulation.pluckIdsFromLineage(doc.parent)) || [];
      const violatingParentId = parentIdsOfDoc.find(winnerId => loserIds.includes(winnerId));
      if (violatingParentId) {
        throw Error(`Unable to move two documents from the same lineage: '${doc._id}' and '${violatingParentId}'`);
      }
    });
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });

  const loserIds = (args.losers || args.loser || '')
    .split(',')
    .filter(Boolean);

  if (loserIds.length === 0) {
    usage();
    throw Error(`Action "merge-contacts" is missing required list of contacts ${bold('--losers')} to be merged into the winner`);
  }

  if (!args.winner) {
    usage();
    throw Error(`Action "merge-contacts" is missing required parameter ${bold('--winner')}`);
  }

  return {
    winnerId: args.winner,
    loserIds,
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
    force: !!args.force,
  };
};

const usage = () => {
  info(`
${bold('cht-conf\'s merge-contacts action')}
When combined with 'upload-docs' this action merges multiple contacts and all their associated data into one.

${bold('USAGE')}
cht --local merge-contacts -- --winner=<winner_id> --losers=<loser_id1>,<loser_id2>

${bold('OPTIONS')}
--winner=<winner_id>
  Specifies the ID of the contact that should have all other contact data merged into it.

--losers=<loser_id1>,<loser_id2>
  A comma delimited list of IDs of contacts which will be deleted and all of their data will be merged into the winner contact.

--docDirectoryPath=<path to stage docs>
  Specifies the folder used to store the documents representing the changes in hierarchy.
`);
};

const moveReports = async (db, descendantsAndSelf, writeOptions, winnerId, loserId) => {
  let skip = 0;
  let reportDocsBatch;
  do {
    info(`Processing ${skip} to ${skip + BATCH_SIZE} report docs`);
    reportDocsBatch = await fetch.reportsCreatedFor(db, loserId, skip);

    reportDocsBatch.forEach(report => {
      const subjectIds = ['patient_id', 'patient_uuid', 'place_id', 'place_uuid'];
      for (const subjectId of subjectIds) {
        if (report[subjectId]) {
          report[subjectId] = winnerId;
        } 

        if (report.fields[subjectId]) {
          report.fields[subjectId] = winnerId;
        }
      }

      writeDocumentToDisk(writeOptions, report);
    });

    skip += reportDocsBatch.length;
  } while (reportDocsBatch.length >= BATCH_SIZE);

  return skip;
};

const minifyLineageAndWriteToDisk = (docs, parsedArgs) => {
  docs.forEach(doc => {
    lineageManipulation.minifyLineagesInDoc(doc);
    writeDocumentToDisk(parsedArgs, doc);
  });
};

const replaceLineageInContacts = (descendantsAndSelf, replacementLineage, contactId) => descendantsAndSelf.reduce((agg, doc) => {
  // skip top-level because it is now being deleted
  if (doc._id === contactId) {
    return agg;
  }

  const parentWasUpdated = lineageManipulation.replaceLineage(doc, 'parent', replacementLineage, contactId);

  // TODO: seems wrong
  const contactWasUpdated = lineageManipulation.replaceLineage(doc, 'contact', replacementLineage, contactId);
  if (parentWasUpdated || contactWasUpdated) {
    agg.push(doc);
  }
  return agg;
}, []);
