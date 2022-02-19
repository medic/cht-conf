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

const formXLSRegex = /^[a-zA-Z0-9_-]*\.xlsx$/;
const formPropertiesRegex = /^[a-zA-Z0-9_-]*\.properties.json$/;
const formXMLRegex = /^[a-zA-Z0-9_-]*\.xml$/;
const formMediaRegex = /^[a-zA-Z0-9_]+(?:-media)$/;
const DEBOUNCE_DELAY = 10;
const watchers = [];

const watchPath = (path, listener) => {
    if(!fs.existsSync(path)) {
        info(path, 'ignored. Does not exist');
        return;
    }
    watchers.push(fs.watch(path, listener));
};

const formMediaListener = (form, projectPath) => {
    return async () => {
        await uploadForms(projectPath, 'app', {
            forms: [form],
        });
    };
};

const watchFormMediaDir = (dirName, absDirPath) => {
    if (!fs.existsSync(absDirPath) || !fs.lstatSync(absDirPath).isDirectory()) return;
    return watchPath(absDirPath, formMediaListener(dirName.split('-')[0]));
};

const watchFormMediaDirs = (absAppFormsPath)=> {
    fs
        .readdirSync(absAppFormsPath)
        .filter((fileName) => fileName.match(formMediaRegex))
        .forEach((fileName) => {
            const absDirPath = path.join(absAppFormsPath, fileName);
            watchFormMediaDir(fileName, absDirPath);
        });
};

const changeListener = (projectPath, api, callback) => {
    return async (event, fileName) => {
        if (event !== 'change') {
            return;
        }
        if (fileName === 'resources.json' || fileName.match(/.*\.(png|svg)/)) {
            await uploadResources(projectPath);
            if (callback) callback(fileName);
            return;
        }
        if (fileName.match(/messages-[\w]*\.properties/)) {
            await uploadCustomTranslations(environment.apiUrl, projectPath, environment.skipTranslationCheck);
            if (callback) callback(fileName);
            return;
        }
        if (fileName.match(/.*\.js$/) || fileName.match(/^(?:app_settings|base_settings)\.json$/)) {
            await compileAppSettings(projectPath);
            await uploadAppSettings(api, projectPath);
            if (callback) callback(fileName);
            return;
        }
        warn('don\'t know what to do with', fileName);
    };
};

const appFormListener = (projectPath, callback) => {
    let appFormWait = false;
    return async (event, fileName) => {
        if (event !== 'change' || appFormWait) {
            return;
        }
        appFormWait = setTimeout(() => { appFormWait = false; }, DEBOUNCE_DELAY);
        if (fileName.match(formXMLRegex) || fileName.match(formPropertiesRegex)) {
            await uploadForms(projectPath, 'app', {
                forms: [fileName.split('.')[0]],
            });
            if (callback) callback(fileName);
            return;
        }
        if (fileName.match(formXLSRegex)) {
            await convertForms(projectPath, 'app', {
                enketo: true,
                forms: [fileName.split('.')[0]],
                transformer: xml => xml.replace('</instance>', '</instance>\n      <instance id="contact-summary"/>'),
            });
            if (callback) callback(fileName);
            return;
        }
        if (fileName.match(formMediaRegex)) {
            const absDirPath = path.join(projectPath, 'forms', 'app', fileName);
            watchFormMediaDir(fileName, absDirPath, projectPath);
            if (callback) callback(fileName);
            return;
        }
        warn('don\'t know what to do with', fileName);
    };
};

const contactFormListener = (projectPath, callback) => {
    let contactFormWait = false;
    return async (event, fileName) => {
        if (event !== 'change' || contactFormWait) {
            return;
        }
        contactFormWait = setTimeout(() => { contactFormWait = false; }, DEBOUNCE_DELAY);
        if (fileName.match(formXLSRegex)) {
            await convertContactForm(projectPath, [fileName.split('.')[0]]);
            if (callback) callback(fileName);
            return;
        }
        if (fileName.match(formXMLRegex)) {
            await uploadForms(projectPath, 'contact', {
                id_prefix: 'contact:',
                forms: [fileName.split('.')[0]],
                default_context: { person: false, place: false },
            });
            if (callback) callback(fileName);
            return;
        }
        warn('don\'t know what to do with', fileName);
    };
};

const waitForSignal = () => {
    return new Promise((resolve) => {
        process.on('SIGINT', function () {
            resolve();
        });
    });
};

const BASE_PROJECT_DIRS = (projectPath) => [
    projectPath,
    path.join(projectPath, 'app_settings'),
    path.join(projectPath, 'resources'),
    path.join(projectPath, 'translations'),
];

const uploadInitialState = () => {

};

const watchProject = {
    watch: async (projectPath, api, blockFn, callback = {}) => {

        uploadInitialState();

        const appFormsPath = path.join(projectPath, 'forms', 'app');
        const contactFormsPath = path.join(projectPath, 'forms', 'contact');

        watchPath(appFormsPath, appFormListener(projectPath, callback));
        watchFormMediaDirs(appFormsPath);
        watchPath(contactFormsPath, contactFormListener(projectPath, callback));

        BASE_PROJECT_DIRS(projectPath).forEach((path) => {
            watchPath(path, changeListener(projectPath, api, callback));
        });

        info('watching', projectPath, 'for changes');
        await blockFn();
    },
    closeWatchers: () => {
        watchers.forEach(watcher => {
            watcher.close();
        });
    }
};

const api = require('../lib/api');
module.exports = {
    watchProject,
    requiresInstance: true,
    execute: () => watchProject.watch(environment.pathToProject, api(), waitForSignal)
};
