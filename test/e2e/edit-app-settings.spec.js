const { expect } = require('chai');
const request = require('request-promise-native');

const { getProjectUrl } = require('./cht-docker-utils');
const {
  cleanupProject,
  initProject,
  runChtConf,
  readCompiledAppSettings,
  writeBaseAppSettings,
} = require('./cht-conf-utils');

describe('edit-app-settings', () => {
  const findLanguage = (settingsLanguages, locale) => settingsLanguages.find(language => language.locale === locale);

  before(initProject);
  after(cleanupProject);

  it('disables a language, recompile, and push app settings', async () => {
    const url = await getProjectUrl();
    const baseSettings = await request.get({ url: `${url}/api/v1/settings`, json: true });
    expect(findLanguage(baseSettings.languages, 'en').enabled).to.be.true;
    expect(findLanguage(baseSettings.languages, 'fr').enabled).to.be.true;
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
    await writeBaseAppSettings(baseSettings);

    await runChtConf('compile-app-settings');
    const compiledSettings = await readCompiledAppSettings();
    expect(compiledSettings.languages.find(language => language.locale === 'en')).to.deep.equal({
      locale: 'en',
      enabled: false,
    });
    expect(compiledSettings.locale).to.equal('fr');
    expect(compiledSettings.locale_outgoing).to.equal('fr');

    await runChtConf('upload-app-settings');
    const newSettings = await request.get({ url: `${url}/api/v1/settings`, json: true });
    expect(newSettings.languages.find(language => language.locale === 'en')).to.deep.equal({
      locale: 'en',
      enabled: false,
    });
    expect(newSettings.locale).to.equal('fr');
    expect(newSettings.locale_outgoing).to.equal('fr');
  });
});
