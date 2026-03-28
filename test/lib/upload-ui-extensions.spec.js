const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const uploadUiExtensions = require('../../src/lib/upload-ui-extensions');
const log = require('../../src/lib/log');

const expect = chai.expect;

describe('Upload UI Extensions Library', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(log, 'info');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should log and return if the ui-extensions directory does not exist', async () => {
    sandbox.stub(fs, 'existsSync').returns(false);

    await uploadUiExtensions('/fake/path');

    expect(log.info.callCount).to.equal(1);
    expect(log.info.args[0][0]).to.include('No directory found at "/fake/path"');
  });

  it('should log and return if no valid extension files are found', async () => {
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs, 'readdirSync').returns(['random-file.txt', 'image.png']);

    await uploadUiExtensions('/fake/path');

    expect(log.info.callCount).to.equal(1);
    expect(log.info.args[0][0]).to.equal('No UI extensions to upload.');
  });
});
