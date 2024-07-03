const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { expect } = require('chai');
const fse = require('fs-extra');
const request = require('request-promise-native');

const COUCHDB_USER = 'medic';
const COUCHDB_PASSWORD = 'password';
const url = `https://${COUCHDB_USER}:${COUCHDB_PASSWORD}@127-0-0-1.local-ip.medicmobile.org:10443`;
const projectDirectory = path.resolve(__dirname, '../../build/e2e-edit-app-settings');

const runChtConf = (command) => new Promise((resolve, reject) => {
    const cliPath = path.join(__dirname, '../../src/bin/index.js');
    exec(`node ${cliPath} --url=${url} ${command}`, { cwd: projectDirectory }, (error, stdout, stderr) => {
        if (!error) {
            return resolve(stdout);
        }

        console.error('error', error);
        console.error('stdout', stdout);
        console.error('stderr', stderr);
        reject(new Error(stdout.toString()));
    });
});

describe('edit-app-settings', () => {
    before(async () => {
        if (fs.existsSync(projectDirectory)) {
            fse.removeSync(projectDirectory);
        }

        fs.mkdirSync(projectDirectory);
        fs.writeFileSync(
            path.join(projectDirectory, 'package.json'),
            JSON.stringify({
                name: 'e2e-edit-app-settings',
                version: '1.0.0',
                dependencies: {
                    'cht-conf': 'file:../..',
                },
            }, null, 4),
        );

        await runChtConf('initialise-project-layout');
    });

    after(async () => {
        // fse.removeSync(projectDirectory);
    });

    it('checks if the mocha test setup works', async () => {
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

        await runChtConf('compile-app-settings');
        const compiledSettings = JSON.parse(
          await fs.promises.readFile(path.join(projectDirectory, 'app_settings.json'))
        );
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
