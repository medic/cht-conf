const supportedActions = require('./supported-actions');

module.exports = () => {
  console.log(`
${bold('NAME')}
  medic-conf - configurerize your Medic Mobile instances

${bold('SYNOPSIS')}
  medic-conf <--local|--instance instance-name|--url url>
Or:
  medic-conf <--local|--instance instance-name|--url url> <action>

${bold('DESCRIPTION')}
  This script will update and upload all of a particular project
  configuration to a particular instance.

  Assumptions are made about the layout of content for a project, and these
  should not be configurable - the script is only intended for use by
  properly-structured projects.

${bold('SUPPORTED ACTIONS')}
  * ${supportedActions.join('\n	* ')}

${bold('SPECIFYING URL')}
  --local
    Upload to http://admin:pass@localhost:5988

  --instance <instance-name>
    Upload to https://admin:<password>@<instance-name>.medicmobile.org

  --user <user-name> --instance <instance-name>
    Upload to https://<user-name>:<password>@<instance-name>.medicmobile.org

  --url <url>
    Upload to URL specified.

${bold('OPTIONS')}
  --help
    Display this usage message

  --shell-completion
  --shell-completion=bash
    Generate the shell-completion script for use in bash.

  --supported-actions
    Display a list of supported actions.

  --version
    Display the current version number.

  --changelog
    Display application changelog.
  
  --accept-self-signed-certs
    Allows medic-conf to work with self signed certs by telling node to ignore the error 
`);
};

const bold = text => `\x1b[1m${text}\x1b[0m`;
