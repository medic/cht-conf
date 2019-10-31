const path = require('path');
const assert = require('chai').assert;

describe('shell-completion', () => {

  it('should supply --options and actions', () => {

    // expect
    return assertShellComplete('',
        '--instance',
        '--local',
        '--url',
        '--user',

        '--help',
        '--shell-completion',
        '--supported-actions',
        '--version',
        '--accept-self-signed-certs',
        '--skip-dependency-check',

        'backup-all-forms',
        'backup-app-settings',
        'check-for-updates',
        'compile-app-settings',
        'compress-images',
        'compress-pngs',
        'compress-svgs',
        'convert-app-forms',
        'convert-collect-forms',
        'convert-contact-forms',
        'create-users',
        'csv-to-docs',
        'delete-all-forms',
        'delete-forms',
        'fetch-csvs-from-google-drive',
        'fetch-forms-from-google-drive',
        'initialise-project-layout',
        'move-contacts',
        'upload-app-forms',
        'upload-app-settings',
        'upload-collect-forms',
        'upload-contact-forms',
        'upload-custom-translations',
        'upload-docs',
        'upload-resources',
        'upload-sms-from-csv');

  });

});

const execSync = require('child_process').execSync;

function assertShellComplete(cliArgs, ...expectedResponses) {
  if(!Array.isArray(cliArgs)) cliArgs = [ cliArgs ];

  const pathToBin = path.join(__dirname, '../..', 'src/bin/shell-completion.js');
  return execPromise(pathToBin, cliArgs.length, cliArgs[cliArgs.length-1])
    .then(res => res.split(/\s/))
    .then(res => res.filter(s => s.trim()))
    .then(res => assert.deepEqual(res, expectedResponses));
}

function execPromise(...args) {
  try {
    var buf = execSync(args.join(' '));
    return Promise.resolve(buf.toString());
  } catch(e) {
    return Promise.reject(e);
  }
}
