const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const request = require('request-promise-native');

const { cleanupProject, getProjectDirectory, initProject, runChtConf } = require('./cht-conf-utils');
const { getProjectUrl } = require('./cht-docker-utils');

describe('edit-app-settings', () => {
  const projectName = 'e2e-edit-app-settings';
  const projectDirectory = getProjectDirectory(projectName);

  before(async () => {
    await initProject(projectName);
  });

  after(async () => {
    await cleanupProject(projectName);
  });

  it('checks if the mocha test setup works', async () => {
    const url = getProjectUrl();
    const initialSettings = await request.get({ url: `${url}/api/v1/settings`, json: true });

    // eslint-disable-next-line no-undef
    const baseSettings = structuredClone(initialSettings); // TODO: upgrade eslint to accept syntax supported by node 18+
    baseSettings.languages = baseSettings.languages.map(language => {
      if (language.locale === 'en') {
        language.enabled = false;
      }

      return language;
    });
    baseSettings.locale = 'fr';
    baseSettings.locale_outgoing = 'fr';
    await fs.promises.writeFile(
      path.join(projectDirectory, 'app_settings/base_settings.json'),
      JSON.stringify(baseSettings, null, 2),
    );

    await runChtConf(projectName, 'compile-app-settings');
    const compiledSettings = JSON.parse(
      await fs.promises.readFile(path.join(projectDirectory, 'app_settings.json'))
    );
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
