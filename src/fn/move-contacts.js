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
    return HierarchyOperations(db, options).move(args.sourceIds, args.destinationId);
  }
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });

  const sourceIds = (args.contacts || args.contact || '')
    .split(',')
    .filter(id => id);

  if (sourceIds.length === 0) {
    usage();
    throw Error('Action "move-contacts" is missing required list of contacts to be moved');
  }

  if (!args.parent) {
    usage();
    throw Error('Action "move-contacts" is missing required parameter parent');
  }

  return {
    destinationId: args.parent,
    sourceIds,
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
    force: !!args.force,
  };
};

const bold = text => `\x1b[1m${text}\x1b[0m`;
const usage = () => {
  /* eslint-disable max-len */
  info(`
${bold('cht-conf\'s move-contacts action')}
When combined with 'upload-docs' this action effectively moves a contact from one place in the hierarchy to another.

${bold('USAGE')}
cht --local move-contacts -- --contacts=<id1>,<id2> --parent=<parent_id>

${bold('OPTIONS')}
--contacts=<id1>,<id2>
  A comma delimited list of ids of contacts to be moved.

--parent=<parent_id>
  Specifies the ID of the new parent. Use '${HierarchyOperations.HIERARCHY_ROOT}' to identify the top of the hierarchy (no parent).

--docDirectoryPath=<path to stage docs>
  Specifies the folder used to store the documents representing the changes in hierarchy.
`);
  /* eslint-enable max-len */
};
