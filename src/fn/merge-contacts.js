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
      disableUsers: args.disableUsers,
      docDirectoryPath: args.docDirectoryPath,
      force: args.force,
    };
    return HierarchyOperations(db, options).merge(args.sourceIds, args.destinationId);
  }
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });

  const sourceIds = (args.sources || args.source || '')
    .split(',')
    .filter(Boolean);

  if (!args.destination) {
    usage();
    throw Error(`Action "merge-contacts" is missing required contact ID ${bold('--destination')}. Other contacts will be merged into this contact.`);
  }

  if (sourceIds.length === 0) {
    usage();
    throw Error(`Action "merge-contacts" is missing required contact ID(s) ${bold('--sources')}. These contacts will be merged into the contact specified by ${bold('--destination')}`);
  }

  return {
    destinationId: args.destination,
    sourceIds,
    disableUsers: !!args['disable-users'],
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
    force: !!args.force,
  };
};

const bold = text => `\x1b[1m${text}\x1b[0m`;
const usage = () => {
  info(`
${bold('cht-conf\'s merge-contacts action')}
When combined with 'upload-docs' this action moves all of the contacts and reports under ${bold('sources')} to be under ${bold('destination')}.
The top-level ${bold('source contact(s)')} are deleted and no data from this document is merged or preserved.

${bold('USAGE')}
cht --local merge-contacts -- --destination=<destination_id> --sources=<source_id1>,<source_id2>

${bold('OPTIONS')}
--destination=<destination_id>
  Specifies the ID of the contact that should receive the moving contacts and reports.

--sources=<source_id1>,<source_id2>
  A comma delimited list of IDs of contacts which will be deleted. The hierarchy of contacts and reports under it will be moved to be under the destination contact.

--disable-users
  When flag is present, users at any deleted place will be updated and may be permanently disabled. Supported by CHT Core 4.7 and above.

--docDirectoryPath=<path to stage docs>
  Specifies the folder used to store the documents representing the changes in hierarchy.
`);
};
