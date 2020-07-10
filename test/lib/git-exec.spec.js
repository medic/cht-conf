//const { expect, assert } = require('chai');
const { gitStatus } = require('./../../src/lib/git-exec');

describe('git-exec', () => {

  it('execute `git status` do not raise any issue', async () => {
    await gitStatus();
  });
});
