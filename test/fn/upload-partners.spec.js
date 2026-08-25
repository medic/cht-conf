const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const environment = require('../../src/lib/environment');
const { validatePartners } = require('../../src/lib/validate-configuration-docs');
const uploadPartners = rewire('../../src/fn/upload-partners');

describe('Upload Partners', () => {
  afterEach(() => {
    sinon.reset();
  });

  it('should call uploadConfigurationDocs with expected parameters', async () => {
    sinon.stub(environment, 'pathToProject').get(() => '.');
    const configurationPath = `${environment.pathToProject}/partners.json`;
    const directoryPath = `${environment.pathToProject}/partners`;
    const dbDocName = 'partners';
    const uploadConfigurationDocs = sinon.stub().returns(Promise.resolve());

    return uploadPartners.__with__({ uploadConfigurationDocs })(async () => {
      await uploadPartners.execute();

      expect(uploadConfigurationDocs.args[0][0]).to.equal(configurationPath);
      expect(uploadConfigurationDocs.args[0][1]).to.equal(directoryPath);
      expect(uploadConfigurationDocs.args[0][2]).to.equal(dbDocName);
      expect(uploadConfigurationDocs.args[0][3]).to.be.undefined;
      expect(uploadConfigurationDocs.args[0][4]).to.equal(validatePartners);
    });
  });
});
