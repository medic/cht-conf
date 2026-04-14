const chai = require('chai');
const sinon = require('sinon');
const fs = require('node:fs');

const { uploadUiExtensions } = require('../../src/lib/upload-ui-extensions');
const log = require('../../src/lib/log');

const expect = chai.expect;
chai.use(require('chai-as-promised'));

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

  it('should throw an error if an extension name does not match custom element standards', async () => {
    sandbox.stub(fs, 'existsSync').returns(true);
    // "myExtension" is invalid (has uppercase, no hyphen)
    sandbox.stub(fs, 'readdirSync').returns(['myExtension.js', 'myExtension.properties.json']);

    await expect(uploadUiExtensions('/fake/path'))
      .to.be.rejectedWith('UI Extension name "myExtension" is invalid.');
  });

  it('should throw an error if missing either the .js or .properties.json file', async () => {
    sandbox.stub(fs, 'readdirSync').returns(['valid-name.js']);
    
    sandbox.stub(fs, 'existsSync').callsFake((path) => {
      if (path.includes('.properties.json')) {return false;}
      return true;
    });

    await expect(uploadUiExtensions('/fake/path'))
      .to.be.rejectedWith('UI Extension "valid-name" is missing either its .js or .properties.json file.');
  });

  it('should throw an error if properties.json is invalid JSON', async () => {
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs, 'readdirSync').returns(['valid-name.js', 'valid-name.properties.json']);
    
    // simulates a broken JSON file
    sandbox.stub(fs, 'readFileSync').returns('invalid json { oops');

    await expect(uploadUiExtensions('/fake/path'))
      .to.be.rejectedWith('Failed to parse valid-name.properties.json - Invalid JSON format.');
  });

  it('should throw an error if properties.json fails Joi schema validation', async () => {
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs, 'readdirSync').returns(['valid-name.js', 'valid-name.properties.json']);
    
    // missing required fields like 'icon' and 'config'
    const invalidProps = { type: 'app_main_tab', title: 'My Extension' };
    sandbox.stub(fs, 'readFileSync').returns(JSON.stringify(invalidProps));

    await expect(uploadUiExtensions('/fake/path'))
      .to.be.rejectedWith('Validation error for UI extension "valid-name":');
  });
});
