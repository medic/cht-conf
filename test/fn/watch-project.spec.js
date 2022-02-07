const { expect, assert } = require('chai');
const sinon = require('sinon');
const path = require('path');
const api = require('../api-stub');
const fs = require('../../src/lib/sync-fs');
const environment = require('../../src/lib/environment');
const { watchProject } = require('../../src/fn/watch-project');
const uploadCustomTranslations = require('../../src/fn/upload-custom-translations').execute;
const { getTranslationDoc, expectTranslationDocs } = require('./utils');

const testDir = path.join(__dirname, '../data/skeleton');
const settingsPath = path.join(testDir, 'app_settings', 'base_settings.json');
const sampleTranslationPath = path.join(testDir, 'translations', 'messages-en.properties');
const appSettings = fs.readJson(settingsPath);

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

function editTranslations() {
  return new Promise((resolve) => {
    fs.fs.appendFileSync(sampleTranslationPath, '\ntest=new');
    resolve();
  });
}

function watchWrapper(action, file) {
  return new Promise((resolve, reject) => {
    watchProject(testDir, mockApi, action, async (path,) => {
      if (path !== file) {
        reject();
      } else {
        resolve();
      }
    });
  });
}

describe('watch-project', function () {

  beforeEach(() => {
    sinon.stub(environment, 'pathToProject').get(() => testDir);
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    sinon.stub(environment, 'skipTranslationCheck').get(() => false);
    sinon.stub(environment, 'force').get(() => false);
    return api.db.put({ _id: '_design/medic-client', deploy_info: { version: '3.5.0' } }).then(() => api.start());
  });
  
  afterEach(() => {
    sinon.restore();
    fs.writeJson(settingsPath, appSettings);
    return api.stop();
  });

  it('watch-project: upload app settings', () => {
    return watchWrapper(editSettings, 'base_settings.json')
      .then(mockApi.getAppSettings)
      .then((settings) => { return JSON.parse(settings.content); })
      .then((settings) => expect(settings.locale).equal('es'));
  });

  it('watch-project: upload custom translations', () => {
    return uploadCustomTranslations()
      .then(() => expectTranslationDocs(api, 'en'))
      .then(watchWrapper(editTranslations, 'messages-en.properties'))
      .then(() => getTranslationDoc(api, 'en'))
      .then(messages => {
        assert.deepEqual(messages.custom, { a:'first', test:'new'});
      });
  });

});
