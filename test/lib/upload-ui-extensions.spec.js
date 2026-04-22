const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const fs = require('node:fs');
const log = require('../../src/lib/log');
const environment = require('../../src/lib/environment');
const warnUploadOverwrite = require('../../src/lib/warn-upload-overwrite');

describe('Upload UI Extensions Library', () => {
  let uploadUiExtensionsModule;
  let uploadUiExtensions;
  let pouch;
  let insertOrReplace;
  let attachmentFromFile;
  let db;

  const validProps = {
    type: 'app_main_tab',
    title: 'My Extension',
    icon: 'star',
    roles: ['admin'],
    config: { foo: 'bar' }
  };

  beforeEach(() => {
    sinon.stub(log, 'info');
    sinon.stub(environment, 'apiUrl').get(() => 'http://localhost/medic');
    sinon.stub(warnUploadOverwrite, 'preUploadDoc');
    sinon.stub(warnUploadOverwrite, 'postUploadDoc').resolves();
    sinon.stub(fs, 'existsSync').returns(true);
    sinon.stub(fs, 'readdirSync');

    uploadUiExtensionsModule = rewire('../../src/lib/upload-ui-extensions');
    uploadUiExtensions = uploadUiExtensionsModule.uploadUiExtensions;

    db = { fake: 'db' };
    pouch = sinon.stub().returns(db);
    insertOrReplace = sinon.stub().resolves();
    attachmentFromFile = sinon.stub().returns({ content_type: 'application/javascript', data: Buffer.from('js') });

    uploadUiExtensionsModule.__set__('pouch', pouch);
    uploadUiExtensionsModule.__set__('insertOrReplace', insertOrReplace);
    uploadUiExtensionsModule.__set__('attachmentFromFile', attachmentFromFile);
  });

  afterEach(() => sinon.restore());

  it('logs a message when the ui-extensions directory does not exist', async () => {
    fs.existsSync.returns(false);

    await uploadUiExtensions('/fake/path');

    expect(log.info).to.have.been.calledOnceWithExactly(
      'No directory found at "/fake/path" - not uploading ui-extensions'
    );
    expect(pouch.called).to.be.false;
  });

  it('logs a message when no valid extension files are found', async () => {
    fs.readdirSync.returns(['random-file.txt', 'image.png']);

    await uploadUiExtensions('/fake/path');

    expect(log.info).to.have.been.calledOnceWithExactly('No UI extensions to upload.');
    expect(pouch.called).to.be.false;
  });

  [
    'myExtension',
    'myextension',
    'my$ext',
  ].forEach(invalidName => {
    it('throws an exception when the extension name is invalid', async () => {
      fs.readdirSync.returns([`${invalidName}.js`, `${invalidName}.properties.json`]);

      await expect(uploadUiExtensions('/fake/path'))
        .to.be.rejectedWith(`UI Extension name "${invalidName}" is invalid.`);
    });
  });

  it('throws an exception if the .properties.json file is missing', async () => {
    fs.readdirSync.returns(['valid-name.js']);
    fs.existsSync.callsFake((p) => !p.endsWith('.properties.json'));

    await expect(uploadUiExtensions('/fake/path'))
      .to.be.rejectedWith('UI Extension "valid-name" is missing either its .js or .properties.json file.');
  });

  it('throws an exception if the .js file is missing', async () => {
    fs.readdirSync.returns(['valid-name.properties.json']);
    fs.existsSync.callsFake((p) => !p.endsWith('.js') || p === '/fake/path');

    await expect(uploadUiExtensions('/fake/path'))
      .to.be.rejectedWith('UI Extension "valid-name" is missing either its .js or .properties.json file.');
  });

  it('throws an exception if properties.json is invalid JSON', async () => {
    fs.readdirSync.returns(['valid-name.js', 'valid-name.properties.json']);
    sinon.stub(fs, 'readFileSync').returns('invalid json { oops');

    await expect(uploadUiExtensions('/fake/path'))
      .to.be.rejectedWith('Failed to parse valid-name.properties.json - Invalid JSON format:');
  });

  [
    { type: 'app_main_tab', title: 'My Extension' },
    { type: 'app_main_tab', icon: 'my-icon' },
    { title: 'My Extension', icon: 'my-icon' },
    { type: 'app_main_tab', title: 'My Extension', icon: 'my-icon', roles: 'my-role' },
    { type: 'app_main_tab', title: 'My Extension', icon: 'my-icon', roles: ['my-role'], config: 'my-config' },
  ].forEach(invalidProps => {
    it('throws an exception if properties.json fails Joi schema validation', async () => {
      fs.readdirSync.returns(['valid-name.js', 'valid-name.properties.json']);

      sinon.stub(fs, 'readFileSync').returns(JSON.stringify(invalidProps));

      await expect(uploadUiExtensions('/fake/path'))
        .to.be.rejectedWith('Validation error for UI extension "valid-name":');
    });
  });

  it('uploads extension when remote differs', async () => {
    fs.readdirSync.returns(['valid-name.js', 'valid-name.properties.json']);
    sinon.stub(fs, 'readFileSync').returns(JSON.stringify(validProps));
    warnUploadOverwrite.preUploadDoc.resolves(true);

    await uploadUiExtensions('/fake/path');

    expect(pouch).to.have.been.calledOnceWithExactly('http://localhost/medic');
    expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(1);
    expect(insertOrReplace.callCount).to.equal(1);
    expect(insertOrReplace.args[0][0]).to.equal(db);
    expect(insertOrReplace.args[0][1]).to.deep.include({
      _id: 'ui-extension:valid-name',
      type: 'app_main_tab',
      title: 'My Extension',
      icon: 'star',
    });
    expect(insertOrReplace.args[0][1]._attachments).to.have.property('extension.js');
    expect(attachmentFromFile.calledOnce).to.be.true;
    expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(1);
    expect(log.info.args).to.deep.equal([
      ['Found UI extensions: valid-name'],
      ['UI Extension "valid-name" upload complete'],
    ]);
  });

  it('skips upload when doc matches remote', async () => {
    fs.readdirSync.returns(['valid-name.js', 'valid-name.properties.json']);
    sinon.stub(fs, 'readFileSync').returns(JSON.stringify(validProps));
    warnUploadOverwrite.preUploadDoc.resolves(false);

    await uploadUiExtensions('/fake/path');

    expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(1);
    expect(insertOrReplace.called).to.be.false;
    expect(warnUploadOverwrite.postUploadDoc.called).to.be.false;
    expect(log.info.args).to.deep.equal([
      ['Found UI extensions: valid-name'],
      ['UI Extension "valid-name" not uploaded as already up to date'],
    ]);
  });

  it('bypasses directory reading when specific extensions are provided', async () => {
    sinon.stub(fs, 'readFileSync').returns(JSON.stringify(validProps));
    warnUploadOverwrite.preUploadDoc.resolves(true);

    await uploadUiExtensions('/fake/path', ['only-this-one']);

    expect(fs.readdirSync.called).to.be.false;
    expect(insertOrReplace.callCount).to.equal(1);
    expect(insertOrReplace.args[0][1]._id).to.equal('ui-extension:only-this-one');
  });

  it('should throw for a specific extension whose files do not exist', async () => {
    fs.existsSync.callsFake((p) => p === '/fake/path');

    await expect(uploadUiExtensions('/fake/path', ['missing-ext']))
      .to.be.rejectedWith('UI Extension "missing-ext" is missing either its .js or .properties.json file.');
  });
});
