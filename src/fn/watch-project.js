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

function waitForSignal() {
    return new Promise((resolve) => {
        process.on('SIGINT', function () {
            resolve();
        });
    });
}

const changeListener = function (projectPath, api, callback) {
    return async (event, fileName) => {
        if (event !== 'change') {
            return;
        }
        if (fileName === 'app_settings.json') {
            // ignore
        } else if (fileName === 'resources.json' || fileName.match(/.*\.(png|svg)/)) {
            await uploadResources(projectPath);
            callback(fileName, true);
        } else if (fileName.match(/messages-[\w]*\.properties/)) {
            await uploadCustomTranslations(environment.apiUrl, projectPath, environment.skipTranslationCheck);
            callback(fileName, true);
        } else if (fileName.match(/.*\.js$/) || fileName.match(/.*\.json$/)) {
            await compileAppSettings(projectPath);
            await uploadAppSettings(api, projectPath);
            callback(fileName, true);
        } else {
            warn('main listen: don\'t know what to do with', fileName);
        }
    };
};

let appFormWait = false;
const appFormListener = function (projectPath, callback) {
    return async (event, fileName) => {
        if (event !== 'change' || appFormWait) {
            return;
        }
        appFormWait = setTimeout(() => { appFormWait = false; }, DEBOUNCE_DELAY);
        if (fileName.match(formXLSRegex) || fileName.match(formPropertiesRegex)) {
            await convertForms(projectPath, 'app', {
                enketo: true,
                forms: [fileName.split('.')[0]],
                transformer: xml => xml.replace('</instance>', '</instance>\n      <instance id="contact-summary"/>'),
            });
            await uploadForms(projectPath, 'app', {
                forms: [fileName.split('.')[0]],
            });
            callback(fileName, true);
        } else if (fileName.match(formMediaRegex)) {
            const absDirPath = path.join(projectPath, 'forms', 'app', fileName);
            watchFormMediaDir(fileName, absDirPath, projectPath);
        } else {
            warn('don\'t know what to do with', fileName);
        }
    };
};

const formMediaListener = function (form, projectPath) {
    return async () => {
        await uploadForms(projectPath, 'app', {
            forms: [form],
        });
    };
};

function watchFormMediaDir(dirName, absDirPath, projectPath) {
    if (!fs.existsSync(absDirPath) || !fs.lstatSync(absDirPath).isDirectory()) return;
    return fs.watch(absDirPath, formMediaListener(dirName.split('-')[0], projectPath));
}

let contactFormWait = false;
const contactFormListener = function (projectPath, callback) {
    return async (event, fileName) => {
        if (event !== 'change' || contactFormWait) {
            return;
        }
        contactFormWait = setTimeout(() => { contactFormWait = false; }, DEBOUNCE_DELAY);
        if (fileName.match(formXLSRegex)) {
            await convertContactForm(projectPath, [fileName.split('.')[0]]);
            await uploadForms(projectPath, 'contact', {
                id_prefix: 'contact:',
                forms: [fileName.split('.')[0]],
                default_context: { person: false, place: false },
            });
            callback(fileName, true);
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

const watchProject = {
    watch: async (projectPath, api, blockFn, callback = {}) => {
        const appFormsPath = path.join(projectPath, 'forms', 'app');
        const contactFormsPath = path.join(projectPath, 'forms', 'contact');
        if (!checkExists(appFormsPath) || !checkExists(contactFormsPath)) {
            error('make sure', projectPath, 'has a valid project layout. You can use initialise-project-layout for new projects to get the correct project layout');
            process.exit(1);
        }
        watchers.push(fs.watch(appFormsPath, appFormListener(projectPath, callback)));
        fs.readdirSync(appFormsPath).filter((fileName) => fileName.match(formMediaRegex)).forEach((fileName) => {
            const absDirPath = path.join(appFormsPath, fileName);
            watchers.push(watchFormMediaDir(fileName, absDirPath, projectPath));
        });
        watchers.push(fs.watch(contactFormsPath, contactFormListener(projectPath, callback)));
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
            watchers.push(fs.watch(path, changeListener(projectPath, api, callback)));
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
