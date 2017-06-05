const _ = require('lodash');
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

  describe('URL autocompletion', () => {

    _.forIn({
      'http://admin:pass@': 'http://admin:pass@localhost:5988',
      'http://uname:pword@': 'http://uname:pword@localhost:5988',

      'https://admin:pass@asdf-asdf.': [ 'https://admin:pass@asdf-asdf.app.medicmobile.org', 'https://admin:pass@asdf-asdf.dev.medicmobile.org' ],
      'https://admin:pass@asdf-asdf.app.medic': [ 'https://admin:pass@asdf-asdf.app.medicmobile.org', 'https://admin:pass@asdf-asdf.dev.medicmobile.org' ],
    }, (expectedCompletion, prefix) => {

      if(!Array.isArray(expectedCompletion)) expectedCompletion = [ expectedCompletion ];

      it(`should autocomplete ${prefix}`, () => {

        // expect
        return assertShellComplete(['some-project', prefix], ...expectedCompletion);

      });

    });

    [
      'http://admin',
      'http://admin:',
      'http://admin:pass',

      'https://admin',
      'https://admin:',
      'https://admin:pass',
      'https://admin:pass@',
      'https://admin:pass@asdf',
      'https://admin:pass@asdf-',
      'https://admin:pass@asdf-asdf',
    ].forEach(prefix => {

      it(`should not autocomplete ${prefix}`, () => {

        // expect
        return assertShellComplete(['some-project', prefix], 'http\\://', 'https\\://');

      });

    });

  });

});

const execSync = require('child_process').execSync;

function assertShellComplete(cliArgs, ...expectedResponses) {
  if(!Array.isArray(cliArgs)) cliArgs = [ cliArgs ];

  return execPromise('bin/shell-completion.js', cliArgs.length, cliArgs[cliArgs.length-1])
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
