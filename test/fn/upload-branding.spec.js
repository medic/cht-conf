const { expect } = require('chai');
const sinon = require('sinon');
const api = require('../api-stub');
const rewire = require('rewire');
const uploadBranding = rewire('../../src/fn/upload-branding');

describe('Upload Branding', () => {
  let fs;
  let pouch;
  let warnUploadOverwrite;
  let insertOrReplace;
  let attachmentsFromDir;
  let branding = {
    title: 'Rockstar Clinic',
    resources: {
      logo: 'star.png',
      favicon: 'favicon.ico'
    }
  };

  beforeEach(() => {
    api.start();
    fs = {
      exists: () => true,
      readJson: () => branding,
      path: {
        resolve: () => 'path/branding.json'
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

  it('should upload branding', async () => {
    warnUploadOverwrite.preUploadDoc.returns(true);
    insertOrReplace.returns(Promise.resolve());
    attachmentsFromDir.returns({ image: {} });

    const brandingDoc = {
      _id: 'branding',
      title: 'Rockstar Clinic',
      resources: {
        logo: "star.png",
        favicon: "favicon.ico"
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

    return uploadBranding.__with__(rewireWith)(async () => {
      await uploadBranding.execute();

      expect(attachmentsFromDir.called).to.be.true;
      expect(pouch.called).to.be.true;
      expect(warnUploadOverwrite.preUploadDoc.args[0][1]).to.deep.include(brandingDoc);
      expect(warnUploadOverwrite.postUploadDoc.args[0][0]).to.deep.include(brandingDoc);
      expect(insertOrReplace.args[0][1]).to.deep.include(brandingDoc);
    });
  });
});
