const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const log = require('../../src/lib/log');
const warnUploadOverwrite = require('../../src/lib/warn-upload-overwrite');

const uploadExtensionLibs = rewire('../../src/fn/upload-extension-libs');

describe('Upload extension libs', () => {

  let attachmentsFromDir;
  let insertOrReplace;

  beforeEach(() => {
    sinon.stub(log, 'info');
    sinon.stub(warnUploadOverwrite, 'preUploadDoc');
    sinon.stub(warnUploadOverwrite, 'postUploadDoc');
    attachmentsFromDir = sinon.stub();
    insertOrReplace = sinon.stub().resolves();
    uploadExtensionLibs.__set__('pouch', () => {});
    uploadExtensionLibs.__set__('environment', {
      apiUrl: 'test',
      pathToProject: '/testpath'
    });
    uploadExtensionLibs.__set__('attachmentsFromDir', attachmentsFromDir);
    uploadExtensionLibs.__set__('insertOrReplace', insertOrReplace);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('log and skip when dir is empty', async () => {
    attachmentsFromDir.returns({});
    await uploadExtensionLibs.execute();
    expect(attachmentsFromDir.callCount).to.equal(1);
    expect(attachmentsFromDir.args[0][0]).to.equal('/testpath/extension-libs');
    expect(insertOrReplace.callCount).to.equal(0);
    expect(log.info.callCount).to.equal(1);
    expect(log.info.args[0][0]).to.equal('No configuration found at "/testpath/extension-libs" - not uploading extension-libs');
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
