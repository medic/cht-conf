const { expect } = require('chai');
const sinon = require('sinon');
const api = require('../api-stub');
const rewire = require('rewire');
const uploadPartners = rewire('../../src/fn/upload-partners');

describe('Upload Partners', () => {
  let fs;
  let pouch;
  let warnUploadOverwrite;
  let insertOrReplace;
  let attachmentsFromDir;
  let partners = {
    resources: {
      greatCompany: 'greatCompany.png',
      aliasCompany: 'aliasCompany.png'
    }
  };

  beforeEach(() => {
    api.start();
    fs = {
      exists: () => true,
      readJson: () => partners,
      path: {
        resolve: () => 'path/partners.json'
      }
    };
    warnUploadOverwrite = {
      preUploadDoc: sinon.stub(),
      postUploadDoc: sinon.stub()
    };
    pouch = sinon.stub();
    insertOrReplace = sinon.stub();
    attachmentsFromDir = sinon.stub();
  });

  afterEach(() => {
    api.stop();
    sinon.reset();
  });

  it('should upload partners', async () => {
    warnUploadOverwrite.preUploadDoc.returns(true);
    insertOrReplace.returns(Promise.resolve());
    attachmentsFromDir.returns({ image: {} });

    const partnersDoc = {
      _id: 'partners',
      resources: {
        greatCompany: 'greatCompany.png',
        aliasCompany: 'aliasCompany.png'
      },
      _attachments: { image: {} }
    };
    const rewireWith = {
      fs,
      pouch,
      attachmentsFromDir,
      warnUploadOverwrite,
      insertOrReplace
    };

    return uploadPartners.__with__(rewireWith)(async () => {
      await uploadPartners.execute();

      expect(attachmentsFromDir.called).to.be.true;
      expect(pouch.called).to.be.true;
      expect(warnUploadOverwrite.preUploadDoc.args[0][1]).to.deep.include(partnersDoc);
      expect(warnUploadOverwrite.postUploadDoc.args[0][0]).to.deep.include(partnersDoc);
      expect(insertOrReplace.args[0][1]).to.deep.include(partnersDoc);
    });
  });
});
