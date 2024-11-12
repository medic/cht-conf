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
  trace(`Fetching contact details: ${options.winnerId}`);
  const winnerDoc = await Shared.fetch.contact(db, options.winnerId);

  const constraints = await lineageConstraints(db, winnerDoc);
  const loserDocs = await Shared.fetch.contactList(db, options.loserIds);
  await validateContacts(loserDocs, constraints);

  let affectedContactCount = 0, affectedReportCount = 0;
  const replacementLineage = lineageManipulation.createLineageFromDoc(winnerDoc);
  for (let loserId of options.loserIds) {
    const contactDoc = loserDocs[loserId];
    const descendantsAndSelf = await Shared.fetch.descendantsOf(db, loserId);

    const self = descendantsAndSelf.find(d => d._id === loserId);
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
    const updatedDescendants = replaceLineageInContacts(descendantsAndSelf, replacementLineage, loserId);

    const ancestors = await Shared.fetch.ancestorsOf(db, contactDoc);
    trace(`Considering primary contact updates to ${ancestors.length} ancestor(s) of contact ${prettyPrintDocument(contactDoc)}.`);
    const updatedAncestors = Shared.replaceLineageInAncestors(descendantsAndSelf, ancestors);

    minifyLineageAndWriteToDisk([...updatedDescendants, ...updatedAncestors], options);

    const movedReportsCount = await moveReportsAndReassign(db, descendantsAndSelf, options, replacementLineage, loserId);
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
const validateContacts = async (loserDocs, constraints) => {
  Object.values(loserDocs).forEach(doc => {
    const hierarchyError = constraints.getMergeContactHierarchyViolations(doc);
    if (hierarchyError) {
      throw Error(`Hierarchy Constraints: ${hierarchyError}`);
    }
  });
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });

  const loserIds = (args.losers || args.loser || '')
    .split(',')
    .filter(Boolean);

  if (!args.winner) {
    usage();
    throw Error(`Action "merge-contacts" is missing required contact ID ${Shared.bold('--winner')}. Other contacts will be merged into this contact.`);
  }

  if (loserIds.length === 0) {
    usage();
    throw Error(`Action "merge-contacts" is missing required contact ID(s) ${Shared.bold('--losers')}. These contacts will be merged into the contact specified by ${Shared.bold('--winner')}`);
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
${Shared.bold('cht-conf\'s merge-contacts action')}
When combined with 'upload-docs' this action merges multiple contacts and all their associated data into one.

${Shared.bold('USAGE')}
cht --local merge-contacts -- --winner=<winner_id> --losers=<loser_id1>,<loser_id2>

${Shared.bold('OPTIONS')}
--winner=<winner_id>
  Specifies the ID of the contact that should have all other contact data merged into it.

--losers=<loser_id1>,<loser_id2>
  A comma delimited list of IDs of contacts which will be deleted and all of their data will be merged into the winner contact.

--docDirectoryPath=<path to stage docs>
  Specifies the folder used to store the documents representing the changes in hierarchy.
`);
};

const moveReportsAndReassign = async (db, descendantsAndSelf, writeOptions, replacementLineage, loserId) => {
  const descendantIds = descendantsAndSelf.map(contact => contact._id);
  const winnerId = writeOptions.winnerId;

  let skip = 0;
  let reportDocsBatch;
  do {
    info(`Processing ${skip} to ${skip + Shared.BATCH_SIZE} report docs`);
    reportDocsBatch = await Shared.fetch.reportsCreatedByOrFor(db, descendantIds, loserId, skip);

    const updatedReports = replaceLineageInReports(reportDocsBatch, replacementLineage, loserId);

    reportDocsBatch.forEach(report => {
      let updated = false;
      const subjectIds = ['patient_id', 'patient_uuid', 'place_id', 'place_uuid'];
      for (const subjectId of subjectIds) {
        if (report[subjectId] === loserId) {
          report[subjectId] = winnerId;
          updated = true;
        } 

        if (report.fields[subjectId] === loserId) {
          report.fields[subjectId] = winnerId;
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
