const chai = require('chai');
const path = require('path');
const sinon = require('sinon');
const rewire = require('rewire');

const fs = require('../../src/lib/sync-fs');
const compileAppSettings = rewire('../../src/fn/compile-app-settings');
const { expect } = chai;
chai.use(require('chai-exclude'));
chai.use(require('chai-as-promised'));

let writeJson;
let environment;
const scenarios = [
  {
    description: 'should handle simple config',
    folder: 'simple/project',
  },
  {
    description: 'should handle derivative app-settings definitions',
    folder: 'derivative/child',
  },
  {
    description: 'should handle config with no separate task-schedules.json file',
    folder: 'no-task-schedules.json/project',
  },
  {
    description: 'should handle config with combined targets.js definition',
    folder: 'targets.js/project',
  },
  {
    description: 'should handle a project with a purge function that need to be merged with other purge config',
    folder: 'purge/merge-purging-function/project',
  },
  {
    description: 'should handle a project with a purge function',
    folder: 'purge/purging-function/project',
  },
  {
    description: 'should handle a project with correct purge config',
    folder: 'purge/purge-correct/project',
  },
  {
    description: 'should handle a project with no export purge config',
    folder: 'purge/no-export-purge/project',
  },
  {
    description: 'should remove purge config from app_settings when no purge files exist',
    folder: 'purge/no-purge-file/project',
  },
  {
    description: 'should handle a project with eslint error when --debug flag is present',
    folder: 'eslint-error/project',
    extraArgs: ['--debug'],
  },
  {
    description: 'can overwrite eslint rules with eslintrc file',
    folder: 'eslintrc/project',
  },
  {
    description: 'should handle a configuration using the base_settings file',
    folder: 'base-settings/project',
  },
  {
    description: 'should handle a configuration using the forms.json and schedules.json files',
    folder: 'sms-modules/project',
  },
  {
    description: 'should handle a configuration using the assetlinks.json file',
    folder: 'android-app-links/project',
  },

  // REJECTION SCENARIOS
  {
    description: 'should reject declarative config with invalid schema',
    folder: 'invalid-declarative-schema/project',
    error: 'schema validation errors',
  },
  {
    description: 'should reject a project with both old and new nools config',
    folder: 'unexpected-legacy-nools-rules/project',
    error: 'Both legacy and declarative',
  },
  {
    description: 'should reject a project with both purge and purging files',
    folder: 'purge/both-purge-and-purging/project',
    error: 'Purge is defined at both',
  },
  {
    description: 'should reject a project purge file exists and its not valid js',
    folder: 'purge/broken-purge-file/project',
    error: 'Unexpected token',
  },
  {
    description: 'should reject a project invalid purge file config',
    folder: 'purge/invalid-purge/project',
    error: 'Error parsing purge',
  },
  {
    description: 'should reject a project with an uncompilable purging function',
    folder: 'purge/invalid-purging-function/project',
    error: 'Unexpected token',
  },
  {
    description: 'should reject a project where purge.fn is not a function',
    folder: 'purge/purge-fn-not-a-function/project',
    error: 'fn export to be a function',
  },
  {
    description: 'should reject a project with eslint error',
    folder: 'eslint-error/project',
    error: 'Webpack warnings when building',
  },
  {
    description: 'should reject a configuration using invalid forms.json or schedules.json files',
    folder: 'sms-modules/invalid-files',
    error: 'ValidationError',
  },
  {
    description: 'should reject a project with no .eslintrc file defined',
    folder: 'missing-eslintrc/project',
    error: 'No eslint configuration',
  },
  {
    description: 'should reject a configuration using an invalid assetlinks.json file',
    folder: 'android-app-links/invalid-file',
    error: 'Invalid assetlinks: ValidationError: "[0].target.sha256_cert_fingerprints" is required',
  },
];

describe('compile-app-settings', () => {
  beforeEach(() => {
    writeJson = sinon.stub(fs, 'writeJson');
    compileAppSettings.__set__('fs', fs);

    environment = {
      pathToProject: '',
      extraArgs: [],
    };
    compileAppSettings.__set__('environment', environment);
  });
  afterEach(() => {
    sinon.restore();
  });

  for (const scenario of scenarios) {
    it(scenario.description, async () => {
      const pathToTestProject = path.join(__dirname, '../data/compile-app-settings', scenario.folder);
      sinon.stub(environment, 'pathToProject').get(() => pathToTestProject);
      sinon.stub(environment, 'extraArgs').get(() => scenario.extraArgs);

      const promiseToExecute = compileAppSettings.execute({ skipEslintIgnore: true });
      if (scenario.error) {
        await expect(promiseToExecute).to.be.rejectedWith(Error, scenario.error);
      } else {
        await promiseToExecute;
        const actual = JSON.parse(JSON.stringify(writeJson.args[0][1]));
        const expected = JSON.parse(fs.read(`${pathToTestProject}/../app_settings.expected.json`));
        expect(actual)
          .excludingEvery(['rules', 'contact_summary'])
          .to.deep.eq(expected);
      }
    });
  }
});
