const { assert } = require('chai');
const rewire = require('rewire');
const sinon = require('sinon');

const environment = require('../../src/lib/environment');
const fs = require('../../src/lib/sync-fs');
const Shared = rewire('../../src/lib/mm-shared');
const userPrompt = rewire('../../src/lib/user-prompt');


describe('mm-shared', () => {
  let readline;
  
  let docOnj = { docDirectoryPath: '/test/path/for/testing ', force: false };
  beforeEach(() => {
    readline = { keyInYN: sinon.stub() };
    userPrompt.__set__('readline', readline);
    Shared.__set__('userPrompt', userPrompt);
    sinon.stub(fs, 'exists').returns(true);
    sinon.stub(fs, 'recurseFiles').returns(Array(20));
    sinon.stub(fs, 'deleteFilesInFolder').returns(true);
  });
  afterEach(() => {
    sinon.restore();
  });

  it('does not delete files in directory when user presses n', () => {
    readline.keyInYN.returns(false);
    sinon.stub(environment, 'force').get(() => false);
    try {
      Shared.prepareDocumentDirectory(docOnj);
      assert.fail('Expected error to be thrown');
    } catch(e) {
      assert.equal(fs.deleteFilesInFolder.callCount, 0);
    }
  });

  it('deletes files in directory when user presses y', () => {
    readline.keyInYN.returns(true);
    sinon.stub(environment, 'force').get(() => false);
    Shared.prepareDocumentDirectory(docOnj);
    assert.equal(fs.deleteFilesInFolder.callCount, 1);
  });

  it('deletes files in directory when force is set', () => {
    sinon.stub(environment, 'force').get(() => true);
    Shared.prepareDocumentDirectory(docOnj);
    assert.equal(fs.deleteFilesInFolder.callCount, 1);
  });
});
