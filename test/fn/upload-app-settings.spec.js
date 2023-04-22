const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const uploadAppSettings = rewire('../../src/fn/upload-app-settings');

describe('upload-app-settings', () => {
  afterEach(() => {
    sinon.reset();
  });

  const scenarios = [
    // non-declarative configs should not be altered
    { coreVersion: '3.17.1', isDeclarative: undefined, expectNools: false },
    { coreVersion: '4.3.1', isDeclarative: false, expectNools: false },

    // declarative configs should have nools added for versions under 4.2
    { coreVersion: '4.1.99', isDeclarative: true, expectNools: true },
    { coreVersion: '3.99.0-rc2', isDeclarative: true, expectNools: true },
    { coreVersion: '4.2.0', isDeclarative: true, expectNools: false },

    // interesting case when testing on dev
    { coreVersion: '4.2.0-dev', isDeclarative: true, expectNools: true },
  ];

  for (const scenario of scenarios) {
    it(JSON.stringify(scenario), async () => {
      const rules = 'code';
      const appSettings = JSON.stringify({
        tasks: {
          isDeclarative: scenario.isDeclarative,
          rules,
        },
      });

      const apiUpload = sinon.stub().resolves('{ "success": true }');
      const mocks = {
        getValidApiVersion: sinon.stub().resolves(scenario.coreVersion),
        api: () => ({
          updateAppSettings: apiUpload,
        }),
        environment: {
          pathToProject: ',',
        },
        fs: {
          read: sinon.stub().returns(appSettings),
        }
      };

      uploadAppSettings.__set__(mocks);
      await uploadAppSettings.execute();
      expect(apiUpload.calledOnce).to.be.true;
      const isNoolsAdded = JSON.parse(apiUpload.args[0][0]).tasks.rules !== rules;
      expect(isNoolsAdded).to.eq(scenario.expectNools);
    });
  }  
});
