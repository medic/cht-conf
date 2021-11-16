const fs = require('fs');
const environment = require('../lib/environment');
const process = require('process');
const path = require('path');
const { warn, info } = require('../lib/log');

const convertForms = require('../lib/convert-forms');
const uploadForms = require('../lib/upload-forms');
const convertContactForm = require('./convert-contact-forms');
const uploadAppSettings = require('./upload-app-settings');
const compileAppSettings = require('./compile-app-settings');
const uploadCustomTranslations = require('./upload-custom-translations');
const uploadResources = require('./upload-resources');

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
const changeListener = async (_, fileName) => {
    if (changeListenerWait) return;
    changeListenerWait = setTimeout(() => { changeListenerWait = false; }, debounceDelay);

    if (fileName.match(/(app_settings|base_settings)\.json/)) {
        await uploadAppSettings(environment.pathToProject);
    } else if (fileName === 'resources.json' || fileName.match(/.*\.(png|svg)/)) {
        await uploadResources(environment.pathToProject);
    } else if (fileName.match(/messages-[\w]*\.properties/)) {
        await uploadCustomTranslations(environment.apiUrl, environment.pathToProject, environment.skipTranslationCheck);
    } else if (fileName.match(/.*\.js/)) {
        await compileAppSettings(environment.pathToProject);
        await uploadAppSettings(environment.pathToProject);
    } else {
        warn('main listen: don\'t know what to do with', fileName);
    }
};

let appFormListenerWait = false;
const appFormListener = async (_, fileName) => {
    if (appFormListenerWait) return;
    appFormListenerWait = setTimeout(() => { appFormListenerWait = false; }, debounceDelay);

    if (fileName.match(formXLSRegex)) {
        await convertForms(environment.pathToProject, 'app', {
            enketo: true,
            forms: [fileName.split('.')[0]],
            transformer: xml => xml.replace('</instance>', '</instance>\n      <instance id="contact-summary"/>'),
        });
        await uploadForms(environment.pathToProject, 'app', {
            forms: [fileName.split('.')[0]],
        });
    } else {
        if (!fileName.match(formXMLRegex)) {
            warn('don\'t know what to do with', fileName);
        }
    }
};

let contactFormListenerWait = false;
const contactFormListener = async (event, fileName) => {
    if (contactFormListenerWait) return;
    contactFormListenerWait = setTimeout(() => { contactFormListenerWait = false; }, debounceDelay);

    if (fileName.match(formXLSRegex)) {
        await convertContactForm(environment.pathToProject, fileName.split('.')[0]);
        await uploadForms(environment.pathToProject, 'contact', {
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

module.exports = {
    requiresInstance: true,
    execute: async () => {
        fs.watch(path.join(environment.pathToProject, 'forms', 'app'), appFormListener);
        fs.watch(path.join(environment.pathToProject, 'forms', 'contact'), contactFormListener);
        [
            environment.pathToProject,
            path.join(environment.pathToProject, 'resources'),
            path.join(environment.pathToProject, 'translations'),
        ].forEach((path) => {
            fs.watch(path, changeListener);
        });
        info('watching', environment.pathToProject, 'for changes');
        await waitForSignal();
    }
};
