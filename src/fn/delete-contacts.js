const minimist = require('minimist');
const path = require('path');

const environment = require('../lib/environment');
const pouch = require('../lib/db');
const { info } = require('../lib/log');

const HierarchyOperations = require('../lib/hierarchy-operations');

module.exports = {
  requiresInstance: true,
  execute: () => {
    const args = parseExtraArgs(environment.pathToProject, environment.extraArgs);
    const db = pouch();
    const options = {
      docDirectoryPath: args.docDirectoryPath,
      force: args.force,
    };
    return HierarchyOperations(db, options).delete(args.sourceIds);
  }
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });

  const sourceIds = (args.ids || args.id || '')
    .split(',')
    .filter(id => id);

  if (sourceIds.length === 0) {
    usage();
    throw Error('Action "delete-contacts" is missing required list of contacts to be deleted');
  }

  return {
    sourceIds,
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
    force: !!args.force,
  };
};

const bold = text => `\x1b[1m${text}\x1b[0m`;
const usage = () => {
  info(`
${bold('cht-conf\'s delete-contacts action')}
When combined with 'upload-docs' this action recursively deletes a contact and all of their descendant contacts and data. ${bold('This operation is permanent. It cannot be undone.')}

${bold('USAGE')}
cht --local delete-contacts -- --ids=<id1>,<id2>

${bold('OPTIONS')}
--ids=<id1>,<id2>
  A comma delimited list of ids of contacts to be deleted.

--docDirectoryPath=<path to stage docs>
  Specifies the folder used to store the documents representing the changes in hierarchy.
`);
};
