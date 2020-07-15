const { expect } = require('chai');
const rewire = require('rewire');

const git = rewire('./../../src/lib/git-exec');

describe('git-exec', () => {

  it('`checkUpstream` with not upstream changes get empty result', async () => {
    git.__set__('exec', () => Promise.resolve('0\t0'));
    const result = await git.checkUpstream();
    expect(result).to.eq('');
  });

  it('`checkUpstream` with branch changes get text with result', async () => {
    git.__set__('exec', () => Promise.resolve('1\t0'));
    const result = await git.checkUpstream();
    expect(result).to.eq('branch is ahead upstream by 1 commit');
  });

  it('`checkUpstream` with upstream changes get text with result', async () => {
    git.__set__('exec', () => Promise.resolve('0\t2'));
    const result = await git.checkUpstream();
    expect(result).to.eq('branch is behind upstream by 2 commits');
  });

  it('`checkUpstream` with upstream and local branch changes get text with result', async () => {
    git.__set__('exec', () => Promise.resolve('2\t1'));
    const result = await git.checkUpstream();
    expect(result).to.eq('branch is behind upstream by 1 commit and ahead by 2 commits');
  });
});
