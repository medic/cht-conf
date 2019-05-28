const minimist = require('minimist');
const path = require('path');
const readline = require('readline-sync');

const fs = require('../lib/sync-fs');
const log = require('../lib/log');
const pouch = require('../lib/db');

const { warn, trace, info, error } = log;

const HIERARCHY_ROOT = 'root';

module.exports = (projectDir, couchUrl, extraArgs) => {
  const args = parseExtraArgs(projectDir, extraArgs);
  const db = connectToDatabase(couchUrl);
  prepareDocumentDirectory(args.docDirectoryPath);
  return updateLineagesAndStage(args, db);
};

const updateLineagesAndStage = async ({ contactIds, parentId, docDirectoryPath }, db) => {
  trace(`Fetching contact details for parent: ${parentId}`);
 
  const fetchDescendantsFrom = async contactId => (await db.query('medic-client/contacts_by_place', {
    startkey: [contactId],
    endkey: [contactId + '\ufff0'],
    include_docs: true,
  })).rows.map(row => row.doc);

  const fetchReportsCreatedBy = async contactId => (await db.query('medic-client/reports_by_freetext', {
    key: [`contact:${contactId}`],
    include_docs: true,
  })).rows.map(row => row.doc);

  const constructNewLineage = async () => {
    if (parentId === HIERARCHY_ROOT) {
      return undefined;
    }
    
    const parentDoc = await db.get(parentId);
    return { _id: parentDoc._id, parent: parentDoc.parent };
  };

  const replacementLineage = await constructNewLineage();
  const replaceLineagesForDocumentSet = (docs, contactId) => {
    let replacementCount = 0;
    for (let doc of docs) {
      if (replaceLineage(doc, replacementLineage, contactId)) {
        writeDocumentToDisk(docDirectoryPath, doc);
        replacementCount++;
      }
    }

    return replacementCount;
  };

  let affectedContactCount = 0, affectedReportCount = 0;
  for (let contactId of contactIds) {
    const contactDoc = await db.get(contactId);
    const descendantContacts = await fetchDescendantsFrom(contactId);
    trace(`${descendantContacts.length} descendant(s) of contact '${contactDoc.name}' (${contactDoc._id}) will update`);
    
    const descendantsAndSelf = [contactDoc, ...descendantContacts];
    replaceLineagesForDocumentSet(descendantsAndSelf, contactId);
    affectedContactCount += descendantsAndSelf.length;

    for (let descendantDoc of descendantsAndSelf) {
      const reportsCreatedByDescendant = await fetchReportsCreatedBy(descendantDoc._id);
      trace(`${reportsCreatedByDescendant.length} report(s) created by '${descendantDoc.name}' (${descendantDoc._id}) will update`);
      affectedReportCount += replaceLineagesForDocumentSet(reportsCreatedByDescendant, contactId);
    }
  }

  info(`Staged changes to lineage information for ${affectedContactCount} contact(s) and ${affectedReportCount} report(s).`);
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs) => {
  const args = minimist(extraArgs, { boolean: true });
  
  if (args._.length === 0) {
    usage();
    throw Error('Action "move-contact" is missing required list of contact_id to be moved');
  }

  if (!args.parent) {
    usage();
    throw Error('Action "move-contact" is missing required parameter parent');
  }

  return {
    parentId: args.parent,
    contactIds: args._,
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
  };
};

const connectToDatabase = couchUrl => {
  if (!couchUrl) {
    throw ('Action "move-contact" is missing the required couchUrl information');
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
${bold('medic-conf\'s stage-moved-contacts action')}
When combined with 'upload-docs' this action effectively moves a contact from one place in the hierarchy to another.

${bold('USAGE')}
medic-conf --local move-contact -- contact_id --parent=parent_id

${bold('OPTIONS')}
--parent=parent_id
  Specifies the ID of the new parent. Use '${HIERARCHY_ROOT}' to identify the top of the hierarchy (no parent).

--dryRun
  Will report the number of affected users and documents but will not commit any changes.

--docDirectoryPath=<path to stage docs>
  
`);
};

/*
Given a doc, replace the lineage information therein with "replacementLineage"

startingFromIdInLineage (optional) - Will result in a partial replacement of the lineage. The part of the lineage "after" the parent with _id=startingFromIdInLineage
will be replaced by "replacementLineage"
*/
const replaceLineage = (doc, replacementLineage, startingFromIdInLineage) => {
  const lineageAttributeName = doc.type === 'data_record' ? 'contact' : 'parent';
  const doReplacement = (replaceInDoc, docAttr, replaceWith) => {
    if (!replaceWith) {
      const lineageWasDeleted = !!replaceInDoc[docAttr];
      replaceInDoc[docAttr] = undefined;
      return lineageWasDeleted;
    } else if (replaceInDoc[docAttr]) {
      replaceInDoc[docAttr]._id = replaceWith._id;
      replaceInDoc[docAttr].parent = replaceWith.parent;
    } else {
      replaceInDoc[docAttr] = replaceWith;
    }
  
    return true;
  };

  // Replace the full lineage
  if (!startingFromIdInLineage || doc._id === startingFromIdInLineage) {
    return doReplacement(doc, lineageAttributeName, replacementLineage);
  }

  // Replace part of the lineage
  let currentParent = doc[lineageAttributeName];
  do {
    if (currentParent._id === startingFromIdInLineage) {
      return doReplacement(currentParent, 'parent', replacementLineage);
    }
    currentParent = currentParent.parent;
  } while (currentParent);

  return false;
};

const writeDocumentToDisk = (docDirectoryPath, doc) => {
  const destinationPath = path.join(docDirectoryPath, `${doc._id}.doc.json`);
  trace(`Writing updated document to ${destinationPath}`);
  fs.writeJson(destinationPath, doc);
};
