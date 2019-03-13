const path = require('path');
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
  const testDir = path.join(__dirname, '../../build', 'medic-conf.spec', testName);
  mkdirp(testDir);

  const pathToBin = path.join(__dirname, '../..', 'src/bin/medic-conf.js');
  args.unshift(pathToBin);
  try {
    const buf = execSync(args.join(' '), { cwd:testDir });
    return Promise.resolve(buf.toString());
  } catch(e) {
    console.log('Failed while executing medic through CLI');
    console.log(e.stdout.toString());
    return Promise.reject(e);
  }
}
