const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const fs = require('node:fs');
const log = require('../../src/lib/log');
const environment = require('../../src/lib/environment');
const warnUploadOverwrite = require('../../src/lib/warn-upload-overwrite');

describe('UI Extensions Library', () => {
  let uiExtensionsModule;
  let pouch;
  let db;

  beforeEach(() => {
    sinon.stub(log, 'info');
    sinon.stub(log, 'warn');
    sinon.stub(environment, 'apiUrl').get(() => 'http://localhost/medic');
    uiExtensionsModule = rewire('../../src/lib/ui-extensions');

    db = {
      get: sinon.stub(),
      allDocs: sinon.stub(),
      remove: sinon.stub()
    };
    pouch = sinon.stub().returns(db);
    uiExtensionsModule.__set__('pouch', pouch);
  });

  afterEach(() => sinon.restore());

  describe('uploadUiExtensions', () => {
    let uploadUiExtensions;
    let insertOrReplace;
    let attachmentFromFile;

    const validProps = {
      type: 'app_main_tab',
      title: 'My Extension',
      icon: 'fa-star',
      accent_color: 'red',
      roles: ['admin'],
      config: { foo: 'bar' }
    };

    beforeEach(() => {
      sinon.stub(warnUploadOverwrite, 'preUploadDoc');
      sinon.stub(warnUploadOverwrite, 'postUploadDoc').resolves();
      sinon.stub(fs, 'existsSync').returns(true);
      sinon.stub(fs, 'readdirSync');

      uploadUiExtensions = uiExtensionsModule.uploadUiExtensions;

      insertOrReplace = sinon.stub().resolves();
      attachmentFromFile = sinon.stub().returns({ content_type: 'application/javascript', data: Buffer.from('js') });

      uiExtensionsModule.__set__('insertOrReplace', insertOrReplace);
      uiExtensionsModule.__set__('attachmentFromFile', attachmentFromFile);
    });

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
      'my extension',
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
      { type: 'app_main_tab' },
      { title: 'My Extension' },
      { type: 'app_main_tab', title: 'My Extension', roles: 'my-role' },
      { type: 'app_main_tab', title: 'My Extension', roles: ['my-role'], config: 'my-config' },
      { ...validProps, resource_icon: 'icon.png' },
      { ...validProps, icon: 'icon' }
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
      expect(insertOrReplace.args[0][1]).to.deep.include(validProps);
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

  describe('deleteUiExtensions', () => {
    it('should log and return if no extensions are found to delete', async () => {
      db.allDocs.resolves({ rows: [] });

      await uiExtensionsModule.deleteUiExtensions([]);

      expect(log.info.calledWith('No UI extensions found to delete.')).to.be.true;
      expect(db.remove.called).to.be.false;
    });

    it('should delete all extensions if no specific names are provided', async () => {
      db.allDocs.resolves({
        rows: [
          { doc: { _id: 'ui-extension:ext-one', _rev: '1' } },
          { doc: { _id: 'ui-extension:ext-two', _rev: '1' } }
        ]
      });
      db.remove.resolves();

      await uiExtensionsModule.deleteUiExtensions([]);

      expect(db.allDocs.calledOnce).to.be.true;
      expect(db.remove.calledTwice).to.be.true;
      expect(log.info.calledWith('Deleted UI Extension: ext-one')).to.be.true;
      expect(log.info.calledWith('Deleted UI Extension: ext-two')).to.be.true;
    });

    it('should delete only specific extensions when provided', async () => {
      const targetDoc = { _id: 'ui-extension:target-ext', _rev: '1' };
      const targetDoc1 = { _id: 'ui-extension:target-ext1', _rev: '1' };
      db.get.withArgs('ui-extension:target-ext').resolves(targetDoc);
      db.get.withArgs('ui-extension:target-ext1').resolves(targetDoc1);
      db.remove.resolves();

      await uiExtensionsModule.deleteUiExtensions(['target-ext', 'target-ext1']);

      expect(db.allDocs.called).to.be.false;
      expect(db.get.args).to.deep.equal([
        ['ui-extension:target-ext'],
        ['ui-extension:target-ext1']
      ]);
      expect(db.remove.args).to.deep.equal([
        [targetDoc],
        [targetDoc1]
      ]);
    });

    it('should log a warning if a specific extension is not found (404)', async () => {
      const notFoundError = new Error('missing');
      notFoundError.status = 404;
      db.get.rejects(notFoundError);

      await uiExtensionsModule.deleteUiExtensions(['missing-ext']);

      expect(log.warn.calledWith('UI Extension "missing-ext" not found in database. Skipping.')).to.be.true;
      expect(db.remove.called).to.be.false;
    });

    it('should throw an error when getting an extension doc fails', async () => {
      db.get.rejects(new Error('CouchDB read error'));

      await expect(uiExtensionsModule.deleteUiExtensions(['broken-ext']))
        .to.be.rejectedWith(`Failed to fetch extension "broken-ext": CouchDB read error`);

      expect(db.remove.called).to.be.false;
    });

    it('should throw an error if the database removal fails', async () => {
      const targetDoc = { _id: 'ui-extension:broken-ext', _rev: '1' };
      db.get.resolves(targetDoc);
      db.remove.rejects(new Error('CouchDB write error'));

      await expect(uiExtensionsModule.deleteUiExtensions(['broken-ext']))
        .to.be.rejectedWith('Failed to delete ui-extension:broken-ext: CouchDB write error');
    });
  });
});
