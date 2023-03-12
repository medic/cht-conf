const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const fs = require('fs/promises');

const uploadExtensionLibs = rewire('../../src/fn/upload-extension-libs');
const log = require('../../src/lib/log');
const warnUploadOverwrite = require('../../src/lib/warn-upload-overwrite');

describe('Upload extension libs', () => {
  let db;
  let attachmentsFromDir;
  let insertOrReplace;

  before(() => {
    db = {};
    sinon.stub(log, 'info');
    sinon.stub(fs, 'stat');
    sinon.stub(fs, 'readdir');
    sinon.stub(warnUploadOverwrite, 'preUploadDoc');
    sinon.stub(warnUploadOverwrite, 'postUploadDoc');
    attachmentsFromDir = sinon.stub();
    insertOrReplace = sinon.stub().resolves();
    uploadExtensionLibs.__set__('pouch', () => db);
    uploadExtensionLibs.__set__('environment', {
      apiUrl: 'test',
      pathToProject: '/testpath'
    });
    uploadExtensionLibs.__set__('attachmentsFromDir', attachmentsFromDir);
    uploadExtensionLibs.__set__('insertOrReplace', insertOrReplace);
  });

  afterEach(() => {
    sinon.reset();
  });

  describe('getConfiguredLibs', () => {

    it('log and skip when dir does not exist', async () => {
      fs.stat.throws(new Error('file not found'));
      await uploadExtensionLibs.execute();
      expect(attachmentsFromDir.callCount).to.equal(0);
      expect(insertOrReplace.callCount).to.equal(0);
      expect(fs.stat.callCount).to.equal(1);
      expect(fs.stat.args[0][0]).to.equal('/testpath/extension-libs');
      expect(log.info.callCount).to.equal(1);
      expect(log.info.args[0][0]).to.equal('No configuration found at "/testpath/extension-libs" - not uploading extension-libs');
    });

    it('log and skip when path is not dir', async () => {
      const stats = { isDirectory: sinon.stub().returns(false) };
      fs.stat.resolves(stats);
      await uploadExtensionLibs.execute();
      expect(attachmentsFromDir.callCount).to.equal(0);
      expect(insertOrReplace.callCount).to.equal(0);
      expect(log.info.callCount).to.equal(1);
      expect(log.info.args[0][0]).to.equal('No configuration found at "/testpath/extension-libs" - not uploading extension-libs');
    });

    it('log and skip when dir is empty', async () => {
      const stat = { isDirectory: sinon.stub().returns(true) };
      fs.stat.resolves(stat);
      fs.readdir.resolves([]);
      await uploadExtensionLibs.execute();
      expect(attachmentsFromDir.callCount).to.equal(0);
      expect(insertOrReplace.callCount).to.equal(0);
      expect(log.info.callCount).to.equal(1);
      expect(log.info.args[0][0]).to.equal('No configuration found at "/testpath/extension-libs" - not uploading extension-libs');
    });

  });

  describe('updates doc', () => {

    beforeEach(() => {
      fs.stat.resolves({ isDirectory: sinon.stub().returns(true) });
      fs.readdir.resolves([ 'script.js', 'data.json' ]);
    });

    it('does nothing if doc matches remote', async () => {
      attachmentsFromDir.returns({ 'script.js': {}, 'data.json': {} });
      warnUploadOverwrite.preUploadDoc.resolves(false);

      await uploadExtensionLibs.execute();
      expect(attachmentsFromDir.callCount).to.equal(1);
      expect(attachmentsFromDir.args[0][0]).to.equal('/testpath/extension-libs');
      expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(1);
      expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(0);
      expect(insertOrReplace.callCount).to.equal(0);
      expect(log.info.args[0][0]).to.equal('Extension libs not uploaded as already up to date');
    });

    it('should update doc when attachments found', async () => {
      attachmentsFromDir.returns({ 'script.js': {}, 'data.json': {} });
      warnUploadOverwrite.preUploadDoc.resolves(true);

      await uploadExtensionLibs.execute();
      expect(attachmentsFromDir.callCount).to.equal(1);
      expect(attachmentsFromDir.args[0][0]).to.equal('/testpath/extension-libs');
      expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(1);
      expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(1);
      expect(insertOrReplace.callCount).to.equal(1);
      expect(insertOrReplace.args[0][1]).to.deep.equal({
        _id: 'extension-libs',
        _attachments: {
          'data.json': {},
          'script.js': {}
        }
      });
      expect(log.info.args[0][0]).to.equal('Extension libs upload complete');
    });

  });

});
