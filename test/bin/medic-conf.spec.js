const assert = require('chai').assert;
const execSync = require('child_process').execSync;

describe('medic-conf cli', () => {

  describe('with --version flag', () => {
    it('should return a valid version number', () =>
      medicConfCli('--version')
        .then(versionString => {
          assert.match(versionString, /[0-9]+\.[0-9]+\.[0-9]/);
        }));
  });

});

function medicConfCli(...args) {
  args.unshift('../../src/bin/medic-conf.js');
  try {
    var buf = execSync(args.join(' '));
    return Promise.resolve(buf.toString());
  } catch(e) {
    return Promise.reject(e);
  }
}
