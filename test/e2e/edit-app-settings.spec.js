const { expect } = require('chai');
const request = require('request-promise-native');

const { DEFAULT_PROJECT_NAME, getProjectUrl } = require('./cht-docker-utils');
const {
  cleanupProject,
  initProject,
  runChtConf,
  readCompiledAppSettings,
  writeBaseAppSettings,
} = require('./cht-conf-utils');

describe('edit-app-settings', () => {
  const projectName = DEFAULT_PROJECT_NAME;

  before(async () => {
    await initProject(projectName);
  });

  after(async () => {
    await cleanupProject(projectName);
  });

  it('disables a language, recompile, and push app settings', async () => {
    const url = await getProjectUrl(projectName);
    const baseSettings = await request.get({ url: `${url}/api/v1/settings`, json: true });
    baseSettings.languages.forEach(language => expect(language.enabled).to.be.true);
    expect(baseSettings.locale).to.equal('en');
    expect(baseSettings.locale_outgoing).to.equal('en');

    baseSettings.languages = baseSettings.languages.map(language => {
      if (language.locale === 'en') {
        language.enabled = false;
      }

      return language;
    });
    baseSettings.locale = 'fr';
    baseSettings.locale_outgoing = 'fr';
    await writeBaseAppSettings(projectName, baseSettings);

    await runChtConf(projectName, 'compile-app-settings');
    const compiledSettings = await readCompiledAppSettings(projectName);
    expect(compiledSettings.languages.find(language => language.locale === 'en')).to.deep.equal({
      locale: 'en',
      enabled: false,
    });
    expect(compiledSettings.locale).to.equal('fr');
    expect(compiledSettings.locale_outgoing).to.equal('fr');

    await runChtConf(projectName, 'upload-app-settings');
    const newSettings = await request.get({ url: `${url}/api/v1/settings`, json: true });
    expect(newSettings.languages.find(language => language.locale === 'en')).to.deep.equal({
      locale: 'en',
      enabled: false,
    });
    expect(newSettings.locale).to.equal('fr');
    expect(newSettings.locale_outgoing).to.equal('fr');
  });
});
