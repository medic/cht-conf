const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const api = require('../api-stub');
const fs = require('../../src/lib/sync-fs');
const environment = require('../../src/lib/environment');
const { watchProject } = require('../../src/fn/watch-project');

const testDir = path.join(__dirname, '../data/skeleton');
const settingsPath = path.join(testDir, 'app_settings', 'base_settings.json');
const appSettings = fs.readJson(settingsPath);

describe('watch-project', function () {

  beforeEach(() => {
    sinon.stub(environment, 'pathToProject').get(() => testDir);
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    sinon.stub(environment, 'skipTranslationCheck').get(() => false);
    sinon.stub(environment, 'force').get(() => false);
    return api.start();
  });

  afterEach(() => {
    sinon.restore();
    fs.writeJson(settingsPath, appSettings);
    return api.stop();
  });

  const mockApi = {
    updateAppSettings: (content) => {
      return api.db.put({ _id: 'app_settings', content })
        .then(() => {
          return '{"success": true, "updated": true}';
        });
    },
    getAppSettings: () => api.db.get('app_settings')
  };
  
  function editSettings() {
    return new Promise((resolve) => {
      const appSettings = fs.readJson(settingsPath);
      appSettings.locale = 'es';
      fs.writeJson(settingsPath, appSettings);
      resolve();
    });
  }

  function watchWrapper() {
    return new Promise((resolve, reject) => {
      watchProject(testDir, mockApi, editSettings, async (path,) => {
        if (path !== 'base_settings.json') {
          reject();
        } else {
          resolve();
        }
      });
    });
  }

  it('watch-project: upload app settings', function () {
    return watchWrapper()
      .then(mockApi.getAppSettings)
      .then((settings) => { return JSON.parse(settings.content); })
      .then((settings) => expect(settings.locale).equal('es'));
  });

});
