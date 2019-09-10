const supportedActions = require('./supported-actions');

module.exports = () => {
  console.log(`
${bold('NAME')}
  medic-conf - Configure your Medic Mobile instances

${bold('SYNOPSIS')}
  medic-conf <--local|--instance=instance-name|--url=url>
Or:
  medic-conf <--local|--instance=instance-name|--url=url|--archive> <actions> -- <params>

${bold('DESCRIPTION')}
  This script updates and uploads a project's configuration.

${bold('SUPPORTED ACTIONS')}
  * ${supportedActions.join('\n  * ')}

${bold('SAVE CONFIG TO')}
  --local
    Upload to http://admin:pass@localhost:5988

  --instance=<instance-name>
    Upload to https://admin:<password>@<instance-name>.medicmobile.org

  --user=<user-name> --instance <instance-name>
    Upload to https://<user-name>:<password>@<instance-name>.medicmobile.org

  --url=<url>
    Upload to URL specified.

  --archive
    Save configuration content to files on disk. Supports optional parameter --destination=<path to save files>.

${bold('OPTIONS')}
  --help
    Display this usage message

  --shell-completion
  --shell-completion=bash
    Generate the shell-completion script for use in bash.

  --source=<path to project folder>

  --supported-actions
    Display a list of supported actions.

  --version
    Display the current version number.

  --changelog
    Display application changelog.
  
  --accept-self-signed-certs
    Allows medic-conf to work with self signed certs by telling node to ignore the error
  
  --skip-dependency-check
    Skips checking the version running is set to the same version in the package.json
`);
};

const bold = text => `\x1b[1m${text}\x1b[0m`;
