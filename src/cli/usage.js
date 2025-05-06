const supportedActions = require('./supported-actions');

module.exports = () => {
  /* eslint-disable max-len */
  console.log(`
${bold('NAME')}
  cht - Configure your CHT instances

${bold('SYNOPSIS')}
  cht <--local|--instance=instance-name|--url=url>
Or:
  cht <--local|--instance=instance-name|--url=url|--archive> <actions> <options> -- <params>

${bold('DESCRIPTION')}
  This script updates and uploads a project's configuration.

${bold('SUPPORTED ACTIONS')}
  * ${supportedActions.join('\n  * ')}

${bold('upload-database-indexes')}
  Define indexes for the "medic" database to enhance query performance. To index only a subset of documents, use "partial_filter_selector".

  Structure:
  | ${bold('Prop')}                                 | ${bold('Description')}                                                                    |
  | ${bold('[key]')}                                | The object key will be used for both the "name" and "ddoc" values of the index |
  | ${bold('"fields"')}                             | A list of fields to index                                                      |
  | ${bold('"partial_filter_selector"')} (optional) | A selector used to filter the set of documents included in the index           |

  Example:
  {
    "testing_by_id_and_type": {
      "fields": ["_id", "type"],
      "partial_filter_selector": {
        "type": { "$nin": ["form", "translations", "meta"] },
        "_id": { "$nin": ["branding", "extension-libs", "resources"] }
      }
  }

  In this example:
  - The index is created on the "_id" and "type" fields. 
    According to the ESR (Equality, Sort, Range) rule, fields used in equality matches should come first, followed by sort fields, and then range fields. 
    This ordering optimizes query performance.
  - The "partial_filter_selector" limits the index to documents where "type" and "_id" do not match the specified values, reducing index size and improving efficiency.

  The filename 'database-indexes.json' should be used to contain the above configuration.

  For more info:
  https://pouchdb.com/api.html#create_index
  https://pouchdb.com/api.html#query_index
  https://docs.couchdb.org/en/stable/api/database/find.html#db-find
  https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/

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
    Save configuration content to files on disk. Requires parameter --destination=<path to save files>.

${bold('OPTIONS')}
  --help
    Display this usage message

  --shell-completion
  --shell-completion=bash
    Generate the shell-completion script for use in bash.

  --source=<path to project folder>. Defaults to the working directory.

  --supported-actions
    Display a list of supported actions.

  --version
    Display the current version number.

  --changelog
    Display application changelog.

  --accept-self-signed-certs
    Allows cht-conf to work with self signed certs by telling node to ignore the error

  --skip-dependency-check
    Skips checking the version running is set to the same version in the package.json

  --skip-git-check
    Skips checking the status of the current repository that holds the configuration

  --skip-translation-check
    Skips checking message translations

  --skip-validate
    Skips form validation  

  --force
    CAN BE DANGEROUS! Passes yes to all commands and any where that would prompt to overwrite changes will overwrite automatically. 
`);
  /* eslint-enable max-len */
};

const bold = text => `\x1b[1m${text}\x1b[0m`;
