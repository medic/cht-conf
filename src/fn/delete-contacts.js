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
      disableUsers: args.disableUsers,
    };
    return HierarchyOperations(db, options).delete(args.sourceIds);
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
    throw Error('Action "delete-contacts" is missing required list of contacts to be deleted');
  }

  return {
    sourceIds,
    disableUsers: !!args['disable-users'],
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
    force: !!args.force,
  };
};

const bold = text => `\x1b[1m${text}\x1b[0m`;
const usage = () => {
  /* eslint-disable max-len */
  info(`
${bold('cht-conf\'s delete-contacts action')}
When combined with 'upload-docs' this action recursively deletes a contact and all of their descendant contacts and data. ${bold('This operation is permanent. It cannot be undone.')}

${bold('USAGE')}
cht --local delete-contacts -- --contacts=<id1>,<id2>

${bold('OPTIONS')}
--contacts=<id1>,<id2>  (or --contact=<id1>,<id2>)
  A comma delimited list of ids of contacts to be deleted.

--disable-users
  When flag is present, users at any deleted place will be permanently disabled.

--docDirectoryPath=<path to stage docs>
  Specifies the folder used to store the documents representing the changes in hierarchy.
`);
  /* eslint-enable max-len */
};
