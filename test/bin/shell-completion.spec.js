const assert = require('chai').assert;

describe('shell-completion', () => {

  it('should supply --options and actions', () => {

    // expect
    return assertShellComplete('',
        '--instance',
        '--local',
        '--url',

        '--help',
        '--shell-completion',
        '--supported-actions',
        '--version',

        'backup-app-settings',
        'backup-all-forms',
        'check-for-updates',
        'compile-app-settings',
        'compress-images',
        'convert-app-forms',
        'convert-collect-forms',
        'convert-contact-forms',
        'csv-to-docs',
        'delete-all-forms',
        'fetch-forms-from-google-drive',
        'initialise-project-layout',
        'upload-app-forms',
        'upload-app-settings',
        'upload-collect-forms',
        'upload-contact-forms',
        'upload-custom-translations',
        'upload-docs',
        'upload-resources');

  });

});

const execSync = require('child_process').execSync;

function assertShellComplete(cliArgs, ...expectedResponses) {
  if(!Array.isArray(cliArgs)) cliArgs = [ cliArgs ];

  return execPromise('../../bin/shell-completion.js', cliArgs.length, cliArgs[cliArgs.length-1])
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
