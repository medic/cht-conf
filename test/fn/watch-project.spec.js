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
const resourceJsonPath = path.join(testDir, 'resources.json');
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

function editResources() {
  return new Promise((resolve) => {
    fs.writeJson(resourceJsonPath, { 'icon': 'test.png' });
    resolve();
  });
}

function editAppFormProperties() {
  return new Promise((resolve) => {
    const propsPath = path.join(testDir, 'forms', 'app', 'death.properties.json');
    const formProperties = fs.readJson(propsPath);
    formProperties.title = 'DEATH';
    fs.writeJson(propsPath, formProperties);
    resolve();
  });
}

function copyAppForm(withProperties = false) {
  return new Promise((resolve) => {
    fs.fs.copyFileSync(path.join(testDir, 'sample-forms', 'app', 'death.xlsx'),
      path.join(testDir, 'forms', 'app', 'death.xlsx'));
    if (withProperties) {
      fs.fs.copyFileSync(path.join(testDir, 'sample-forms', 'app', 'death.properties.json'),
        path.join(testDir, 'forms', 'app', 'death.properties.json'));
    }
    resolve();
  });
}

function copyAppFormProperties() {
  return copyAppForm(true);
}

function copyContactForm() {
  return new Promise((resolve) => {
    fs.fs.copyFileSync(path.join(testDir, 'sample-forms', 'contact', 'household-create.xlsx'),
      path.join(testDir, 'forms', 'contact', 'household-create.xlsx'));
    resolve();
  });
}

function watchWrapper(action, file) {
  return new Promise((resolve, reject) => {
    watchProject.watch(testDir, mockApi, action, async (path,) => {
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
    watchProject.closeWatchers();
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
        assert.deepEqual(messages.custom, { a: 'first', test: 'new' });
      });
  });

  it('watch-project: upload resources', () => {
    return watchWrapper(editResources, 'resources.json')
      .then(() => api.db.allDocs())
      .then(docs => {
        expect(docs.rows.filter(row => row.id === 'resources')).to.not.be.empty;
      });
  });

it('watch-project: upload app forms', () => {
    api.giveResponses({ status: 200, body: { ok: true } });
    return watchWrapper(copyAppForm, 'death.xlsx')
      .then(() => api.db.allDocs())
      .then(docs => {
        expect(docs.rows.filter(row => row.id === 'form:death')).to.not.be.empty;
      })
      .then(() => {
        const appFormPath = path.join(testDir, 'forms', 'app');
        fs.fs.readdirSync(appFormPath).forEach(file => fs.fs.rmSync(path.join(appFormPath, file)));
      });
  });  

  it('watch-project: upload app form on properties change', () => {
    api.giveResponses({ status: 200, body: { ok: true } });
    return copyAppFormProperties()
      .then(() => {
        return watchWrapper(editAppFormProperties, 'death.properties.json');
      })
      .then(() => api.db.allDocs())
      .then(docs => {
        expect(docs.rows.filter(row => row.id === 'form:death')).to.not.be.empty;
      })
      .then(() => {
        const appFormPath = path.join(testDir, 'forms', 'app');
        fs.fs.readdirSync(appFormPath).forEach(file => fs.fs.rmSync(path.join(appFormPath, file)));
      });
  });

  it('watch-project: upload contact forms', () => {
    api.giveResponses({ status: 200, body: { ok: true } });
    return watchWrapper(copyContactForm, 'household-create.xlsx')
      .then(() => api.db.allDocs())
      .then(docs => {
        expect(docs.rows.filter(row => row.id === 'form:contact:household:create')).to.not.be.empty;
      })
      .then(() => {
        const appFormPath = path.join(testDir, 'forms', 'contact');
        fs.fs.readdirSync(appFormPath).forEach(file => fs.fs.rmSync(path.join(appFormPath, file)));
      });
  });

});