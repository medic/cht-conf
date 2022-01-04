const { fs } = require('../lib/sync-fs');
const environment = require('../lib/environment');
const process = require('process');
const path = require('path');
const { warn, error, info } = require('../lib/log');

const convertForms = require('../lib/convert-forms');
const uploadForms = require('../lib/upload-forms');
const { convertContactForm } = require('./convert-contact-forms');
const { uploadAppSettings } = require('./upload-app-settings');
const { compileAppSettings } = require('./compile-app-settings');
const { uploadCustomTranslations } = require('./upload-custom-translations');
const { uploadResources } = require('./upload-resources');

const formXLSRegex = /^[a-zA-Z_]*\.xlsx$/;
const formXMLRegex = /^[a-zA-Z_]*\.xml$/;

const debounceDelay = 150;

function waitForSignal() {
    return new Promise((resolve) => {
        process.on('SIGINT', function () {
            resolve();
        });
    });
}

let changeListenerWait = false;
const changeListener = function (projectPath, api) {
    return async (_, fileName) => {
        if (changeListenerWait) return;
        changeListenerWait = setTimeout(() => { changeListenerWait = false; }, debounceDelay);

        if (fileName === 'app_settings.json') {
            // ignore
        } else if (fileName === 'resources.json' || fileName.match(/.*\.(png|svg)/)) {
            await uploadResources(projectPath);
        } else if (fileName.match(/messages-[\w]*\.properties/)) {
            await uploadCustomTranslations(environment.apiUrl, projectPath, environment.skipTranslationCheck);
        } else if (fileName.match(/.*\.js$/) || fileName.match(/.*\.json$/)) {
            await compileAppSettings(projectPath);
            await uploadAppSettings(api, projectPath);
        } else {
            warn('main listen: don\'t know what to do with', fileName);
        }
    };
};

let appFormListenerWait = false;
const appFormListener = function (projectPath) {
    return async (_, fileName) => {
        if (appFormListenerWait) return;
        appFormListenerWait = setTimeout(() => { appFormListenerWait = false; }, debounceDelay);

        if (fileName.match(formXLSRegex)) {
            await convertForms(projectPath, 'app', {
                enketo: true,
                forms: [fileName.split('.')[0]],
                transformer: xml => xml.replace('</instance>', '</instance>\n      <instance id="contact-summary"/>'),
            });
            await uploadForms(projectPath, 'app', {
                forms: [fileName.split('.')[0]],
            });
        } else {
            if (!fileName.match(formXMLRegex)) {
                warn('don\'t know what to do with', fileName);
            }
        }
    };
};

let contactFormListenerWait = false;
const contactFormListener = function (projectPath) {
    return async (event, fileName) => {
        if (contactFormListenerWait) return;
        contactFormListenerWait = setTimeout(() => { contactFormListenerWait = false; }, debounceDelay);

        if (fileName.match(formXLSRegex)) {
            await convertContactForm(projectPath, fileName.split('.')[0]);
            await uploadForms(projectPath, 'contact', {
                id_prefix: 'contact:',
                forms: [fileName.split('.')[0]],
                default_context: { person: false, place: false },
            });
        } else {
            if (!fileName.match(formXMLRegex)) {
                warn('don\'t know what to do with', fileName);
            }
        }
    };
};

function checkExists(dir) {
    return fs.existsSync(dir);
}

const watchProject = async (projectPath, api, blockFn) => {
    const appFormsPath = path.join(projectPath, 'forms', 'app');
    const contactFormsPath = path.join(projectPath, 'forms', 'contact');
    if (!checkExists(appFormsPath) || !checkExists(contactFormsPath)) {
        error('make sure', projectPath, 'has a valid project layout. You can use initialise-project-layout for new projects to get the correct project layout');
        process.exit(1);
    }
    fs.watch(appFormsPath, appFormListener(projectPath));
    fs.watch(contactFormsPath, contactFormListener(projectPath));
    [
        projectPath,
        path.join(projectPath, 'app_settings'),
        path.join(projectPath, 'resources'),
        path.join(projectPath, 'translations'),
    ].forEach((path) => {
        if (!checkExists(path)) {
            error('make sure', path, 'exists. You can use initialise-project-layout for new projects to get the correct project layout');
            process.exit(1);
        }
        fs.watch(path, changeListener(projectPath, api));
    });
    info('watching', projectPath, 'for changes');
    await blockFn();
};

const api = require('../lib/api');
module.exports = {
    watchProject,
    requiresInstance: true,
    execute: () => watchProject(environment.pathToProject, api(), waitForSignal)
};
