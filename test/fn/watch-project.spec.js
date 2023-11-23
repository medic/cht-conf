const { expect, assert } = require('chai');
const sinon = require('sinon');
const path = require('path');
const api = require('../api-stub');
const fs = require('../../src/lib/sync-fs');
const fse = require('fs-extra');
const environment = require('../../src/lib/environment');
const { watchProject } = require('../../src/fn/watch-project');
const uploadCustomTranslations = require('../../src/fn/upload-custom-translations').execute;
const { getTranslationDoc, expectTranslationDocs } = require('./utils');

const {
  APP_FORMS_PATH,
  CONTACT_FORMS_PATH,
  COLLECT_FORMS_PATH,
  TRAINING_FORMS_PATH,
  RESOURCE_CONFIG_PATH,
  APP_SETTINGS_DIR_PATH
} = require('../../src/lib/project-paths');
const testDir = path.join(__dirname, '../data/skeleton');
const appFormDir = path.join(testDir, APP_FORMS_PATH);
const trainingFormDir = path.join(testDir, TRAINING_FORMS_PATH);
const collectFormsDir = path.join(testDir, COLLECT_FORMS_PATH);
const contactFormsDir = path.join(testDir, CONTACT_FORMS_PATH);
const snapshotsDir = path.join(testDir, '.snapshots');
const baseSettingsPath = path.join(testDir, APP_SETTINGS_DIR_PATH, 'base_settings.json');
const appSettingsPath = path.join(testDir, 'app_settings.json');
const sampleTranslationPath = path.join(testDir, 'translations', 'messages-en.properties');
const resourceJsonPath = path.join(testDir, RESOURCE_CONFIG_PATH);
const baseSettings = fs.readJson(baseSettingsPath);
const appSettings = fs.readJson(appSettingsPath);
const messagesEn = fs.read(sampleTranslationPath);

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
  const appSettings = fs.readJson(baseSettingsPath);
  appSettings.locale = 'es';
  fs.writeJson(baseSettingsPath, appSettings);
}

function editAppSettings() {
  const appSettings = fs.readJson(appSettingsPath);
  appSettings.locale = 'es';
  fs.writeJson(appSettingsPath, appSettings);
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
  fse.copySync(absSampleDir, path.join(testDir, destination));
}

function cleanFolders(folderPaths) {
  (folderPaths || []).forEach(folder => {
    if (!fs.exists(folder)) {
      return;
    }
    fs.deleteFilesInFolder(folder);
  });
}

function deleteFormFromFolder(folderPath, formFileName) {
  fs.fs
    .readdirSync(folderPath)
    .filter(fileName => fileName.startsWith(formFileName))
    .forEach(file => fse.removeSync(path.join(folderPath, file)));
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

describe.skip('watch-project', function () {
  beforeEach(() => {
    sinon.stub(environment, 'pathToProject').get(() => testDir);
    sinon.stub(environment, 'extraArgs').get(() => { });
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    sinon.stub(environment, 'skipTranslationCheck').get(() => false);
    sinon.stub(environment, 'skipValidate').get(() => false);
    sinon.stub(environment, 'force').get(() => false);
    return api.db.put({ _id: '_design/medic-client', deploy_info: { version: '3.5.0' } }).then(() => api.start());
  });

  afterEach(async () => {
    cleanFolders([ appFormDir, collectFormsDir, trainingFormDir, contactFormsDir ]);
    sinon.restore();
    fs.writeJson(baseSettingsPath, baseSettings);
    fs.writeJson(appSettingsPath, appSettings);
    fs.write(sampleTranslationPath, messagesEn);
    if (fs.exists(snapshotsDir)) {
      fs.deleteFilesInFolder(snapshotsDir);
      fs.fs.rmdirSync(snapshotsDir);
    }
    await api.stop();
    await watchProject.close();
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
    api.giveResponses(
      {
        status: 200,
        body: { version: '3.5.0' },
      },
      {
        status: 200,
        body: { compressible_types: 'text/*, application/javascript, application/json, application/xml' },
      },
    );

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
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include('resources');
      })
      .then(() => fs.writeJson(resourceJsonPath, {}));
  });

  it('watch-project: convert app forms', () => {
    const form = 'death';
    const copyForm = () => copySampleForms('convert-app-form');

    return watchWrapper(copyForm, `${form}.xlsx`)
      .then(() => {
        const appForms = fs.fs.readdirSync(appFormDir);
        expect(appForms).to.include(`${form}.xml`);
      });
  });

  it('watch-project: convert collect forms', () => {
    const form = 'f';
    const copyForm = () => copySampleForms('collect-xlsx', COLLECT_FORMS_PATH);

    return watchWrapper(copyForm, `${form}.xlsx`)
      .then(() => {
        const appForms = fs.fs.readdirSync(collectFormsDir);
        expect(appForms).to.include(`${form}.xml`);
      });
  });

  it('watch-project: upload app forms', () => {
    const form = 'death';
    const copySampleForm = () => {
      copySampleForms('upload-app-form');
    };

    api.giveResponses({ status: 200, body: { ok: true } }, { status: 200, body: { version: '1.0.0' } });

    return watchWrapper(copySampleForm, `${form}.xml`)
      .then(() => api.db.allDocs())
      .then(docs => {
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include(`form:${form}`);
      });
  });

  it('watch-project: delete app forms', () => {
    const form = 'death';
    copySampleForms('upload-app-form');
    const deleteForm = () => deleteFormFromFolder(appFormDir, form);
    return api.db.put({ _id: `form:${form}` })
      .then(() => watchWrapper(deleteForm, `${form}.xml`))
      .then(() => api.db.allDocs())
      .then(docs => {
        const doc = docs.rows.find(doc => doc.id === `form:${form}`);
        expect(doc).to.be.undefined;
      });
  });

  it('watch-project: do not delete app form when a form part exists', function () {
    this.timeout(15000);

    const form = 'death';
    copySampleForms('delete-form');
    const deleteForm = () => {
      fse.removeSync(path.join(appFormDir, `${form}.xml`));
    };
    return api.db.put({ _id: `form:${form}` })
      .then(() => watchWrapper(deleteForm, `${form}.xml`))
      .then(() => api.db.allDocs())
      .then(docs => {
        const doc = docs.rows.find(doc => doc.id === `form:${form}`);
        expect(doc).to.be.not.undefined;
      });
  });

  it('watch-project: upload convert forms', () => {
    const form = 'f';
    const copySampleForm = () => {
      copySampleForms('collect-xml', COLLECT_FORMS_PATH);
    };

    api.giveResponses({ status: 200, body: { ok: true } }, { status: 200, body: { version: '1.0.0' } });

    return watchWrapper(copySampleForm, `${form}.xml`)
      .then(() => api.db.allDocs())
      .then(docs => {
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include(`form:${form}`);
      });
  });

  it('watch-project: upload app form on properties change', () => {
    const form = 'death';
    copySampleForms('upload-properties');

    api.giveResponses({ status: 200, body: { ok: true } }, { status: 200, body: { version: '1.0.0' } });

    return watchWrapper(editAppFormProperties, `${form}.properties.json`)
      .then(() => api.db.allDocs())
      .then(docs => {
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include(`form:${form}`);
      });
  });

  it('watch-project: upload app form on form-media change', () => {
    const form = 'death';
    copySampleForms('form-media');
    const dummyPng = 'test.png';
    const formMediaDir = path.join(appFormDir, `${form}-media`);
    const createFormMediaDir = () => {
      fs.fs.writeFileSync(path.join(formMediaDir, dummyPng), '');
    };

    api.giveResponses({ status: 200, body: { ok: true } }, { status: 200, body: { version: '1.0.0' } });

    return watchWrapper(createFormMediaDir, dummyPng)
      .then(() => api.db.allDocs())
      .then(docs => {
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include(`form:${form}`);
      });
  });

  it('watch-project: convert training forms', () => {
    const form = 'new_actions_training';
    const copyForm = () => copySampleForms('training-xlsx', TRAINING_FORMS_PATH);

    return watchWrapper(copyForm, `${form}.xlsx`)
      .then(() => {
        const forms = fs.fs.readdirSync(trainingFormDir);
        expect(forms).to.include(`${form}.xml`);
      });
  });

  it('watch-project: upload training forms', () => {
    const form = 'new_actions_training';
    const copyForm = () => copySampleForms('training-xml', TRAINING_FORMS_PATH);

    api.giveResponses({ status: 200, body: { ok: true } }, { status: 200, body: { version: '1.0.0' } });

    return watchWrapper(copyForm, `${form}.xml`)
      .then(() => api.db.allDocs())
      .then(docs => {
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include(`form:training:${form}`);
      });
  });

  it('watch-project: upload training form on form-media change', () => {
    const form = 'training';
    copySampleForms('training-form-media', TRAINING_FORMS_PATH);
    const dummyPng = 'test.png';
    const formMediaDir = path.join(trainingFormDir, `${form}-media`);
    const createFormMediaDir = () => {
      fs.fs.writeFileSync(path.join(formMediaDir, dummyPng), '');
    };

    api.giveResponses({ status: 200, body: { ok: true } }, { status: 200, body: { version: '1.0.0' } });

    return watchWrapper(createFormMediaDir, dummyPng)
      .then(() => api.db.allDocs())
      .then(docs => {
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include(`form:training:${form}`);
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
      });
  });

  it('watch-project: upload contact forms', () => {
    const form = 'chw_area-edit';
    const copyContactForm = () => {
      copySampleForms('contact-xml', path.join('forms', 'contact'));
    };

    api.giveResponses({ status: 200, body: { ok: true } }, { status: 200, body: { version: '1.0.0' } });

    return watchWrapper(copyContactForm, `${form}.xml`)
      .then(() => api.db.allDocs())
      .then(docs => {
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include(`form:contact:${form.replace('-', ':')}`);
      });
  });

  it('watch-project: upload app forms --skip-validate', () => {
    sinon.stub(environment, 'skipValidate').get(() => true);
    const form = 'death';
    const copySampleForm = () => {
      copySampleForms('upload-app-form');
    };

    return watchWrapper(copySampleForm, `${form}.xml`)
      .then(() => api.db.allDocs())
      .then(docs => {
        const docIds = docs.rows.map(row => row.id);
        expect(docIds).to.include(`form:${form}`);
        // No requests should have been made to the api since the validations were not run
        expect(api.requestLog()).to.be.empty;
      });
  });

});
