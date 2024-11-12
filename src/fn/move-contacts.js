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
    return updateLineagesAndStage(args, db);
  }
};

const updateLineagesAndStage = async (options, db) => {
  trace(`Fetching contact details for parent: ${options.parentId}`);
  const parentDoc = await Shared.fetch.contact(db, options.parentId);

  const constraints = await lineageConstraints(db, parentDoc);
  const contactDocs = await Shared.fetch.contactList(db, options.contactIds);
  await validateContacts(contactDocs, constraints);

  let affectedContactCount = 0, affectedReportCount = 0;
  const replacementLineage = lineageManipulation.createLineageFromDoc(parentDoc);
  for (let contactId of options.contactIds) {
    const contactDoc = contactDocs[contactId];
    const descendantsAndSelf = await Shared.fetch.descendantsOf(db, contactId);

    // Check that primary contact is not removed from areas where they are required
    const invalidPrimaryContactDoc = await constraints.getPrimaryContactViolations(contactDoc, descendantsAndSelf);
    if (invalidPrimaryContactDoc) {
      throw Error(`Cannot remove contact ${Shared.prettyPrintDocument(invalidPrimaryContactDoc)} from the hierarchy for which they are a primary contact.`);
    }

    trace(`Considering lineage updates to ${descendantsAndSelf.length} descendant(s) of contact ${Shared.prettyPrintDocument(contactDoc)}.`);
    const updatedDescendants = replaceLineageInContacts(descendantsAndSelf, replacementLineage, contactId);

    const ancestors = await Shared.fetch.ancestorsOf(db, contactDoc);
    trace(`Considering primary contact updates to ${ancestors.length} ancestor(s) of contact ${Shared.prettyPrintDocument(contactDoc)}.`);
    const updatedAncestors = Shared.replaceLineageInAncestors(descendantsAndSelf, ancestors);

    minifyLineageAndWriteToDisk([...updatedDescendants, ...updatedAncestors], options);

    const movedReportsCount = await moveReports(db, descendantsAndSelf, options, replacementLineage, contactId);
    trace(`${movedReportsCount} report(s) created by these affected contact(s) will be updated`);

    affectedContactCount += updatedDescendants.length + updatedAncestors.length;
    affectedReportCount += movedReportsCount;

    info(`Staged updates to ${Shared.prettyPrintDocument(contactDoc)}. ${updatedDescendants.length} contact(s) and ${movedReportsCount} report(s).`);
  }

  info(`Staged changes to lineage information for ${affectedContactCount} contact(s) and ${affectedReportCount} report(s).`);
};

/*
Checks for any errors which this will create in the hierarchy (hierarchy schema, circular hierarchies)
Confirms the list of contacts are possible to move
*/
const validateContacts = async (contactDocs, constraints) => {
  Object.values(contactDocs).forEach(doc => {
    const hierarchyError = constraints.getMoveContactHierarchyViolations(doc);
    if (hierarchyError) {
      throw Error(`Hierarchy Constraints: ${hierarchyError}`);
    }
  });

  /*
  It is nice that the tool can move lists of contacts as one operation, but strange things happen when two contactIds are in the same lineage.
  For example, moving a district_hospital and moving a contact under that district_hospital to a new clinic causes multiple colliding writes to the same json file.
  */
  const contactIds = Object.keys(contactDocs);
  Object.values(contactDocs)
    .forEach(doc => {
      const parentIdsOfDoc = (doc.parent && lineageManipulation.pluckIdsFromLineage(doc.parent)) || [];
      const violatingParentId = parentIdsOfDoc.find(parentId => contactIds.includes(parentId));
      if (violatingParentId) {
        throw Error(`Unable to move two documents from the same lineage: '${doc._id}' and '${violatingParentId}'`);
      }
    });
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });

  const contactIds = (args.contacts || args.contact || '')
    .split(',')
    .filter(id => id);

  if (contactIds.length === 0) {
    usage();
    throw Error('Action "move-contacts" is missing required list of contacts to be moved');
  }

  if (!args.parent) {
    usage();
    throw Error('Action "move-contacts" is missing required parameter parent');
  }

  return {
    parentId: args.parent,
    contactIds,
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
    force: !!args.force,
  };
};

const usage = () => {
  info(`
${Shared.bold('cht-conf\'s move-contacts action')}
When combined with 'upload-docs' this action effectively moves a contact from one place in the hierarchy to another.

${Shared.bold('USAGE')}
cht --local move-contacts -- --contacts=<id1>,<id2> --parent=<parent_id>

${Shared.bold('OPTIONS')}
--contacts=<id1>,<id2>
  A comma delimited list of ids of contacts to be moved.

--parent=<parent_id>
  Specifies the ID of the new parent. Use '${Shared.HIERARCHY_ROOT}' to identify the top of the hierarchy (no parent).

--docDirectoryPath=<path to stage docs>
  Specifies the folder used to store the documents representing the changes in hierarchy.
`);
};

const moveReports = async (db, descendantsAndSelf, writeOptions, replacementLineage, contactId) => {
  const contactIds = descendantsAndSelf.map(contact => contact._id);

  let skip = 0;
  let reportDocsBatch;
  do {
    info(`Processing ${skip} to ${skip + Shared.BATCH_SIZE} report docs`);
    reportDocsBatch = await Shared.fetch.reportsCreatedBy(db, contactIds, skip);

      const updatedReports = replaceLineageInReports(reportDocsBatch, replacementLineage, contactId);
      minifyLineageAndWriteToDisk(updatedReports, writeOptions);

    skip += reportDocsBatch.length;
  } while (reportDocsBatch.length >= Shared.BATCH_SIZE);

  return skip;
};

const minifyLineageAndWriteToDisk = (docs, parsedArgs) => {
  docs.forEach(doc => {
    lineageManipulation.minifyLineagesInDoc(doc);
    Shared.writeDocumentToDisk(parsedArgs, doc);
  });
};

const replaceLineageInReports = (reportsCreatedByDescendants, replaceWith, startingFromIdInLineage) => reportsCreatedByDescendants.reduce((agg, doc) => {
  if (lineageManipulation.replaceLineageAfter(doc, 'contact', replaceWith, startingFromIdInLineage)) {
    agg.push(doc);
  }
  return agg;
}, []);

const replaceLineageInContacts = (descendantsAndSelf, replacementLineage, contactId) => descendantsAndSelf.reduce((agg, doc) => {
  const startingFromIdInLineage = doc._id === contactId ? undefined : contactId;
  const parentWasUpdated = lineageManipulation.replaceLineageAfter(doc, 'parent', replacementLineage, startingFromIdInLineage);
  const contactWasUpdated = lineageManipulation.replaceLineageAfter(doc, 'contact', replacementLineage, contactId);
  if (parentWasUpdated || contactWasUpdated) {
    agg.push(doc);
  }
  return agg;
}, []);
