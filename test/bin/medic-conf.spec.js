const assert = require('chai').assert;
const execSync = require('child_process').execSync;
const mkdirp = require('mkdirp').sync;

describe('medic-conf cli', () => {

  describe('with --version flag', () => {
    it('should return a valid version number', () =>
      medicConfCli('version', '--version')
        .then(versionString => {
          assert.match(versionString, /[0-9]+\.[0-9]+\.[0-9]/);
        }));
  });

  it('should be able to compile-app-settings from initialise-project-layout', () => {
    return medicConfCli('gen-and-compile', '--no-check', 'initialise-project-layout')
      .then(() => medicConfCli('gen-and-compile', '--no-check', 'compile-app-settings'));
  });

});

function medicConfCli(testName, ...args) {
  const testDir = `medic-conf.spec/${testName}`;

  mkdirp(testDir);
  args.unshift('../../../../src/bin/medic-conf.js');
  try {
    var buf = execSync(args.join(' '), { cwd:testDir });
    return Promise.resolve(buf.toString());
  } catch(e) {
    return Promise.reject(e);
  }
}
