const minimist = require('minimist');
const path = require('path');
const readline = require('readline-sync');

const fs = require('../lib/sync-fs');
const log = require('../lib/log');
const pouch = require('../lib/db');
const { replaceLineages } = require('../lib/lineage-manipulation');
const lineageConstraints = require('../lib/lineage-constraints');

const { warn, trace, info, error } = log;

const HIERARCHY_ROOT = 'root';

module.exports = (projectDir, couchUrl, extraArgs) => {
  const args = parseExtraArgs(projectDir, extraArgs);
  const db = connectToDatabase(couchUrl);
  prepareDocumentDirectory(args.docDirectoryPath);
  return updateLineagesAndStage(args, db);
};

const prettyPrintDocument = doc => `'${doc.name}' (${doc._id})`;
const updateLineagesAndStage = async ({ contactIds, parentId, docDirectoryPath }, db) => {
  trace(`Fetching contact details for parent: ${parentId}`);

  const parentDoc = parentId === HIERARCHY_ROOT ? undefined : await db.get(parentId);
  const buildLineageOfParent = () => {
    if (!parentDoc) {
      return undefined;
    }

    return { _id: parentDoc._id, parent: parentDoc.parent };
  };

  confirmParentIsNotSelf(contactIds,parentId);

  let affectedContactCount = 0, affectedReportCount = 0;
  const replacementLineage = buildLineageOfParent();
  const { getConfigurableHierarchyErrors, getPrimaryContactViolations } = await lineageConstraints(db, parentDoc);
  for (let contactId of contactIds) {
    const contactDoc = await db.get(contactId);
    const hierarchyError = getConfigurableHierarchyErrors(contactDoc);
    if (hierarchyError) {
      throw Error(`Configurable Hierarchy: ${hierarchyError}`);
    }

    const descendantContacts = await fetchDescendantsOf(db, contactId);
    trace(`${descendantContacts.length} descendant(s) of contact ${prettyPrintDocument(contactDoc)} will update`);

    const descendantsAndSelf = [contactDoc, ...descendantContacts];
    const invalidPrimaryContactDoc = await getPrimaryContactViolations(contactDoc, descendantsAndSelf);
    if (invalidPrimaryContactDoc) {
      throw Error(`Cannot remove primary contact ${prettyPrintDocument(invalidPrimaryContactDoc)} from hierarchy.`);
    }

    const updatedContacts = replaceLineages(descendantsAndSelf, replacementLineage, contactId);

    const updatedReports = [];
    const reportsCreatedByDescendants = await fetchReportsCreatedBy(db, descendantsAndSelf.map(descendant => descendant._id));
    trace(`${reportsCreatedByDescendants.length} report(s) created by these affected contact(s) will update`);
    updatedReports.push(...replaceLineages(reportsCreatedByDescendants, replacementLineage, contactId));

    [...updatedContacts, ...updatedReports].forEach(updatedDoc => writeDocumentToDisk(docDirectoryPath, updatedDoc));

    affectedContactCount += updatedContacts.length;
    affectedReportCount += updatedReports.length;

    info(`Staged updates to ${prettyPrintDocument(contactDoc)}. ${updatedContacts.length} contact(s) and ${updatedReports.length} report(s).`);
  }

  info(`Staged changes to lineage information for ${affectedContactCount} contact(s) and ${affectedReportCount} report(s).`);
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs) => {
  const args = minimist(extraArgs, { boolean: true });

  if (args._.length === 0) {
    usage();
    throw Error('Action "move-contacts" is missing required list of contact_id to be moved');
  }

  if (!args.parent) {
    usage();
    throw Error('Action "move-contacts" is missing required parameter parent');
  }

  return {
    parentId: args.parent,
    contactIds: args._,
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
  };
};

const connectToDatabase = couchUrl => {
  if (!couchUrl) {
    throw ('Action "move-contacts" is missing the required couchUrl information');
  }
  return pouch(couchUrl);
};

const prepareDocumentDirectory = docDirectoryPath => {
  if (!fs.exists(docDirectoryPath)) {
    fs.mkdir(docDirectoryPath);
  } else if (fs.recurseFiles(docDirectoryPath).length > 0) {
    warn(`The document folder '${docDirectoryPath}' already contains files. It is recommended you start with a clean folder. Do you wish to continue?`);
    if(!readline.keyInYN()) {
      error('User failed to confirm action.');
      process.exit(-1);
    }
  }
};

const usage = () => {
  const bold = text => `\x1b[1m${text}\x1b[0m`;
  console.log(`
${bold('medic-conf\'s move-contacts action')}
When combined with 'upload-docs' this action effectively moves a contact from one place in the hierarchy to another.

${bold('USAGE')}
medic-conf --local move-contacts -- <id1> <id2> --parent=<parent_id>

${bold('OPTIONS')}
--parent=<parent_id>
  Specifies the ID of the new parent. Use '${HIERARCHY_ROOT}' to identify the top of the hierarchy (no parent).

--docDirectoryPath=<path to stage docs>
  Specifies the folder used to store the documents representing the changes in hierarchy.
`);
};

const confirmParentIsNotSelf = (contactIds, parentId) => {
  const invalid = contactIds.find(id => parentId === id);
  if (invalid) {
    throw Error(`Cannot set contact's parent to be self ${prettyPrintDocument(invalid)}.`);
  }
};

/*
Given a contact's id, obtain the documents of all descendant contacts
*/
const fetchDescendantsOf = async (db, contactId) => {
  try {
    // For v3.x, use the contacts_by_place view to get all descendants in one query
    const descendantDocs = await db.query('medic-client/contacts_by_place', {
      key: [contactId],
      include_docs: true,
    });

    return descendantDocs.rows.map(row => row.doc);
  } catch (err) {
    if (err.name !== 'not_found') {
      throw err;
    }

    // For v2.x, use the contacts_by_parent view to get all descendants one level at a time
    const fetchChildren = contactIds => db.query('medic-client/contacts_by_parent', {
      keys: contactIds,
      include_docs: true,
    });

    const descendantDocs = [];
    let idsFoundOnPreviousIteration = [contactId];
    do {
      const childrenDocs = await fetchChildren(idsFoundOnPreviousIteration);
      idsFoundOnPreviousIteration = childrenDocs.rows.map(row => row.doc._id);
      descendantDocs.push(...childrenDocs.rows.map(row => row.doc));
    } while (idsFoundOnPreviousIteration.length > 0);

    return descendantDocs;
  }
};

const fetchReportsCreatedBy = async (db, contactIds) => {
  const reports = await db.query('medic-client/reports_by_freetext', {
    keys: contactIds.map(id => [`contact:${id}`]),
    include_docs: true,
  });

  return reports.rows.map(row => row.doc);
};

const writeDocumentToDisk = (docDirectoryPath, doc) => {
  const destinationPath = path.join(docDirectoryPath, `${doc._id}.doc.json`);
  trace(`Writing updated document to ${destinationPath}`);
  fs.writeJson(destinationPath, doc);
};
