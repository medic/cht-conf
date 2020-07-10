const { expect, assert } = require('chai');
const exec = require('./../../src/lib/exec-promise');

describe('exec-promise', () => {

  it('execute command that does not exist raise a rejected promise', async () => {
    try {
      await exec('cmd-dont-exist.sh', 'some-arg');
      assert.fail('Expected execution error');
    } catch (err) {
      expect(err).to.match(/cmd-dont-exist\.sh: not found/);
    }
  });

  it('execute command that exist resolve in a not rejected promise', async () => {
    await exec('node', '-h');   // No error is raised
  });
});
