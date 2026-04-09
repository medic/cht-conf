const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const apiVersion = rewire('../../src/lib/get-api-version');


describe('get-api-version', () => {
  afterEach(() => {
    sinon.reset();
  });

  const versions = [
    { coreVersion: '4.5.0', validVersion: '4.5.0' },
    { coreVersion: '4.5.0.6922454971', validVersion: '4.5.0' },
    { coreVersion: '4.5.1.6922454971', validVersion: '4.5.1' },
    { coreVersion: 'feature-release', validVersion: null },
    { coreVersion: 'test release for 4.5.0', validVersion: '4.5.0' },
    { coreVersion: '4.5.0-feature-release', validVersion: '4.5.0' },
    { coreVersion: '4.2.0-dev.1682192676689', validVersion: '4.2.0' },
  ];

  for (const version of versions) {
    it(JSON.stringify(version), async () => {
      const mock = {
        getApiVersion: sinon.stub().resolves(version.coreVersion),
      };
      apiVersion.__set__(mock);
      const op = await apiVersion.getValidApiVersion();
      expect(op).to.equal(version.validVersion);
    });
  }

});
