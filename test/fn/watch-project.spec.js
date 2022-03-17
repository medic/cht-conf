const { expect, assert } = require('chai');
const sinon = require('sinon');
const path = require('path');
const api = require('../api-stub');
const fs = require('../../src/lib/sync-fs');
const environment = require('../../src/lib/environment');
const { watchProject } = require('../../src/fn/watch-project');
const uploadCustomTranslations = require('../../src/fn/upload-custom-translations').execute;
const { getTranslationDoc, expectTranslationDocs } = require('./utils');

const { APP_FORMS_PATH, CONTACT_FORMS_PATH, RESOURCE_CONFIG_PATH, APP_SETTINGS_DIR_PATH } = require('../../src/lib/project-paths');
const testDir = path.join(__dirname, '../data/skeleton');
const appFormDir = path.join(testDir, APP_FORMS_PATH);
const contactFormsDir = path.join(testDir, CONTACT_FORMS_PATH);
const settingsPath = path.join(testDir, APP_SETTINGS_DIR_PATH, 'base_settings.json');
const sampleTranslationPath = path.join(testDir, 'translations', 'messages-en.properties');
const resourceJsonPath = path.join(testDir, RESOURCE_CONFIG_PATH);
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
  const appSettings = fs.readJson(settingsPath);
  appSettings.locale = 'es';
  fs.writeJson(settingsPath, appSettings);
}

function editAppSettings() {
  const appSettings = fs.readJson(path.join(testDir, 'app_settings.json'));
  appSettings.locale = 'es';
  fs.writeJson(path.join(testDir, 'app_settings.json'), appSettings);
}

function editTranslations() {
  fs.fs.appendFileSync(sampleTranslationPath, '\ntest=new');
}

function editResources() {
  fs.writeJson(resourceJsonPath, { 'icon': 'test.png' });
}

function editAppFormProperties() {
  const propsPath = path.join(testDir, 'forms', 'app', 'death.properties.json');
  const formProperties = fs.readJson(propsPath);
  formProperties.title = 'DEATH';
  fs.writeJson(propsPath, formProperties);
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
  this.timeout(5000);

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

  const cleanFormDir = (formDir, form) => {
    fs.fs.readdirSync(formDir).filter(name => name.startsWith(form)).forEach(file => fs.fs.unlinkSync(path.join(formDir, file)));
  };

  it('watch-project: convert app forms', () => {
    const form = 'death';
    const copyForm = () => copySampleForms('convert-app-form');

    return watchWrapper(copyForm, `${form}.xlsx`)
      .then(() => {
        const appForms = fs.fs.readdirSync(appFormDir);
        expect(appForms).to.include(`${form}.xml`);
      })
      .then(() => cleanFormDir(appFormDir, form));
  });

  it('watch-project: upload app forms', () => {
    const form = 'death';
    const copySampleForm = () => {
      copySampleForms('upload-app-form');
    };

    api.giveResponses({ status: 200, body: { ok: true } });

    return watchWrapper(copySampleForm, `${form}.xml`)
      .then(() => api.db.allDocs())
      .then(docs => {
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include(`form:${form}`);
      })
      .then(() => cleanFormDir(appFormDir, form));
  });

  it('watch-project: upload app form on properties change', () => {
    const form = 'death';
    copySampleForms('upload-properties');

    api.giveResponses({ status: 200, body: { ok: true } });

    return watchWrapper(editAppFormProperties, `${form}.properties.json`)
      .then(() => api.db.allDocs())
      .then(docs => {
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include(`form:${form}`);
      })
      .then(() => cleanFormDir(appFormDir, form));
  });

  it('watch-project: upload app form on form-media change', () => {
    const form = 'death';
    copySampleForms('upload-app-form');

    const dummyPng = 'test.png';
    const formMediaDir = path.join(appFormDir, `${form}-media`);
    const createFormMediaDir = () => {
      fs.fs.mkdirSync(formMediaDir);
      fs.fs.writeFileSync(path.join(formMediaDir, dummyPng), '');
    };

    api.giveResponses({ status: 200, body: { ok: true } });

    return watchWrapper(createFormMediaDir, dummyPng)
      .then(() => api.db.allDocs())
      .then(docs => {
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include(`form:${form}`);
      })
      .then(() => {
        fs.fs.unlinkSync(path.join(formMediaDir, dummyPng));
        fs.fs.rmdirSync(formMediaDir, { recursive: true, force: true });
        cleanFormDir(appFormDir, form);
      });
  });

  it('watch-project: convert contact forms', () => {
    const form = 'household-create';
    const copyForm = () => {
      copySampleForms('contact-xlsx', path.join('forms', 'contact'));
    };

    return watchWrapper(copyForm, `${form}.xlsx`)
      .then(() => api.db.allDocs())
      .then(() => {
        const contactForms = fs.fs.readdirSync(contactFormsDir);
        expect(contactForms).to.include(`${form}.xml`);
      })
      .then(() => cleanFormDir(contactFormsDir, form));
  });

  it('watch-project: upload contact forms', () => {
    const form = 'chw_area-edit';
    const copyContactForm = () => {
      copySampleForms('contact-xml', path.join('forms', 'contact'));
    };

    api.giveResponses({ status: 200, body: { ok: true } });

    return watchWrapper(copyContactForm, `${form}.xml`)
      .then(() => api.db.allDocs())
      .then(docs => {
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include(`form:contact:${form.replace('-', ':')}`);
      })
      .then(() => cleanFormDir(contactFormsDir, form));
  });

});
