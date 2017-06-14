const supportedActions = require('./supported-actions');

module.exports = exitCode => {
  console.log(`
# This script will update and upload all of a particular project configuration
# to a particular instance.
#
# Assumptions are made about the layout of content for a project, and these
# should not be configurable - the script is only intended for use by properly-
# structured projects.

Usage:
    medic-conf <projectName> <instanceUrl>

Or:
    medic-conf <action> <projectName> <instanceUrl>

Supported actions:
    * ${supportedActions.join('\n    * ')}
`);

  process.exit(exitCode);
};
