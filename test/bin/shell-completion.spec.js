const assert = require('chai').assert;

describe('shell-completion', () => {

  it('should supply --XXX options if initial dash is provided', () => {

    // expect
    return assertShellComplete('-',
        '--help',
        '--shell-completion',
        '--supported-actions',
        '--version');

  });

  it('should supply http... option if entering second word', () => {

    // expect
    return assertShellComplete(['some-project', ''],
        'http\\://',
        'https\\://');
  });

});

const execSync = require('child_process').execSync;

function assertShellComplete(cliArgs, ...expectedResponses) {
  if(!Array.isArray(cliArgs)) cliArgs = [ cliArgs ];

  return execPromise('bin/shell-completion.js', cliArgs.length, ...cliArgs)
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
