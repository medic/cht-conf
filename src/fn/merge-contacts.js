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
    return HierarchyOperations(options, db).merge(args.sourceIds, args.destinationId);
  }
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });

  const sourceIds = (args.remove || '')
    .split(',')
    .filter(Boolean);

  if (!args.keep) {
    usage();
    throw Error(`Action "merge-contacts" is missing required contact ID ${bold('--keep')}. Other contacts will be merged into this contact.`);
  }

  if (sourceIds.length === 0) {
    usage();
    throw Error(`Action "merge-contacts" is missing required contact ID(s) ${bold('--remove')}. These contacts will be merged into the contact specified by ${bold('--keep')}`);
  }

  return {
    destinationId: args.keep,
    sourceIds,
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
    force: !!args.force,
  };
};

const bold = text => `\x1b[1m${text}\x1b[0m`;
const usage = () => {
  info(`
${bold('cht-conf\'s merge-contacts action')}
When combined with 'upload-docs' this action merges multiple contacts and all their associated data into one.

${bold('USAGE')}
cht --local merge-contacts -- --keep=<keep_id> --remove=<remove_id1>,<remove_id2>

${bold('OPTIONS')}
--keep=<keep_id>
  Specifies the ID of the contact that should have all other contact data merged into it.

--remove=<remove_id1>,<remove_id2>
  A comma delimited list of IDs of contacts which will be deleted and all of their data will be merged into the keep contact.

--docDirectoryPath=<path to stage docs>
  Specifies the folder used to store the documents representing the changes in hierarchy.
`);
};
