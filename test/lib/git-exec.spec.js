//const { expect, assert } = require('chai');
const git = require('./../../src/lib/git-exec');

describe('git-exec', () => {

  it('execute `git status` do not raise any error', async () => {
    await git.status();
  });
});
