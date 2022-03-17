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

function editBaseSettings() {
  return new Promise((resolve) => {
    const appSettings = fs.readJson(settingsPath);
    appSettings.locale = 'es';
    fs.writeJson(settingsPath, appSettings);
    resolve();
  });
}

function editAppSettings() {
  return new Promise((resolve) => {
    const appSettings = fs.readJson(path.join(testDir, 'app_settings.json'));
    appSettings.locale = 'es';
    fs.writeJson(path.join(testDir, 'app_settings.json'), appSettings);
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

function copySampleForms(sampleDir, destination = path.join('forms', 'app')) {
  const absSampleDir = path.join(testDir, 'sample-forms', sampleDir);
  fs.fs.readdirSync(absSampleDir).forEach(file => {
    fs.fs.copyFileSync(path.join(absSampleDir, file), path.join(testDir, destination, file));
  });
}

function watchWrapper(action, file) {
  return new Promise((resolve,) => {
    watchProject.watch(mockApi, action, async (path) => {
      if (path === file) {
        resolve();
      }
    });
  });
}

describe('watch-project', function () {

  beforeEach(() => {
    sinon.stub(environment, 'pathToProject').get(() => testDir);
    sinon.stub(environment, 'extraArgs').get(() => { });
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    sinon.stub(environment, 'skipTranslationCheck').get(() => false);
    sinon.stub(environment, 'force').get(() => false);
    return api.db.put({ _id: '_design/medic-client', deploy_info: { version: '3.5.0' } }).then(() => api.start());
  });

  afterEach(() => {
    sinon.restore();
    fs.writeJson(settingsPath, appSettings);
    watchProject.close();
    return api.stop();
  });

  it('watch-project: upload app settings', () => {
    return watchWrapper(editAppSettings, 'app_settings.json')
      .then(mockApi.getAppSettings)
.then((settings) => JSON.parse(settings.content))
      .then((settings) => expect(settings.locale).equal('es'));
  });

  it('watch-project: convert app settings', () => {
    const appSettingsPath = path.join(testDir, 'app_settings.json');
    fs.fs.unlinkSync(appSettingsPath);
    expect(fs.fs.existsSync(appSettingsPath)).to.be.false;
    return watchWrapper(editBaseSettings, 'base_settings.json')
.then(() => fs.readJson(appSettingsPath))
      .then((settings) => expect(settings.locale).equal('es'));
  });

  it('watch-project: upload custom translations', () => {
    return uploadCustomTranslations()
      .then(() => expectTranslationDocs(api, 'en'))
.then(() => watchWrapper(editTranslations, 'messages-en.properties'))
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
      })
      .then(() => {
        fs.writeJson(resourceJsonPath, {});
      });
  });

  it('watch-project: convert app forms', () => {
    const appFormPath = path.join(testDir, 'forms', 'app');
    const copyForm = () => copySampleForms('convert-app-form');
    return watchWrapper(copyForm, 'death.xlsx')
      .then(() => {
const appForms = fs.fs.readdirSync(appFormPath);
expect(appForms).to.include('death.xml');
      })
      .then(() => {
        fs.fs.readdirSync(appFormPath).filter(name => name.startsWith('death')).forEach(file => fs.fs.unlinkSync(path.join(appFormPath, file)));
      });
  });

  it('watch-project: upload app forms', () => {
    const copySampleForm = () => {
      return new Promise((resolve) => {
        copySampleForms('upload-app-form');
        resolve();
      });
    };
    api.giveResponses({ status: 200, body: { ok: true } });
    return watchWrapper(copySampleForm, 'death.xml')
      .then(() => api.db.allDocs())
      .then(docs => {
const docIds = doc.rows.map(row => row.id);
expect(dicIds).to.include('form:death');
      })
      .then(() => {
        const appFormPath = path.join(testDir, 'forms', 'app');
        fs.fs.readdirSync(appFormPath).filter(name => name.startsWith('death')).forEach(file => fs.fs.unlinkSync(path.join(appFormPath, file)));
      });
  });

  it('watch-project: upload app form on properties change', () => {
    copySampleForms('upload-properties');
    api.giveResponses({ status: 200, body: { ok: true } });
    return watchWrapper(editAppFormProperties, 'death.properties.json')
      .then(() => api.db.allDocs())
      .then(docs => {
const docIds = doc.rows.map(row => row.id);
expect(dicIds).to.include('form:death');
      })
      .then(() => {
        const appFormPath = path.join(testDir, 'forms', 'app');
        fs.fs.readdirSync(appFormPath).filter(name => name.startsWith('death')).forEach(file => fs.fs.unlinkSync(path.join(appFormPath, file)));
      });
  });

  it('watch-project: convert contact forms', () => {
    const copyForm = () => {
      return new Promise((resolve) => {
        copySampleForms('contact-xlsx', path.join('forms', 'contact'));
        resolve();
      });
    };
    const contactFormPath = path.join(testDir, 'forms', 'contact');
    return watchWrapper(copyForm, 'household-create.xlsx')
      .then(() => api.db.allDocs())
      .then(() => {
const contactForms = fs.fs.readdirSync(contactFormPath);
expect(contactForms).to.include('household-create.xml');
      })
      .then(() => {
        fs.fs.readdirSync(contactFormPath).filter(name => !name.startsWith('.')).forEach(file => fs.fs.unlinkSync(path.join(contactFormPath, file)));
      });
  });

  it('watch-project: upload contact forms', () => {
    const copyContactForm = () => {
      return new Promise((resolve) => {
        copySampleForms('contact-xml', path.join('forms', 'contact'));
        resolve();
      });
    };
    api.giveResponses({ status: 200, body: { ok: true } });
    return watchWrapper(copyContactForm, 'chw_area-edit.xml')
      .then(() => api.db.allDocs())
      .then(docs => {
const docIds = doc.rows.map(row => row.id);
expect(dicIds).to.include('form:contact:chw_area:edit');
      })
      .then(() => {
        const appFormPath = path.join(testDir, 'forms', 'contact');
        fs.fs.readdirSync(appFormPath).filter(name => !name.startsWith('.')).forEach(file => fs.fs.unlinkSync(path.join(appFormPath, file)));
      });
  });

});
