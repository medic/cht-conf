const environment = require('../lib/environment');
const process = require('process');
const path = require('path');
const { error, info } = require('../lib/log');
const Queue = require('queue-promise');
const watcher = require('@parcel/watcher');
const { uploadAppForms } = require('./upload-app-forms');
const { uploadContactForms } = require('./upload-contact-forms');
const convertForms = require('../lib/convert-forms');
const uploadForms = require('../lib/upload-forms');
const { convertAppForms, APP_FORMS_PATH } = require('./convert-app-forms');
const { convertContactForm, CONTACT_FORMS_PATH } = require('./convert-contact-forms');
const { uploadAppSettings, APP_SETTINGS_DIR } = require('./upload-app-settings');
const compileAppSettings = require('./compile-app-settings').execute;
const { execute: uploadCustomTranslations, TRANSLATIONS_PATH } = require('./upload-custom-translations');
const { execute: uploadResources, RESOURCES_DIR_PATH, RESOURCE_CONFIG_PATH } = require('./upload-resources');

const formMediaRegex = /^[a-zA-Z0-9_]+(?:-media)$/;

const uploadInitialState = (api) => {
    return Promise.all(
        [
            uploadResources(),
            uploadAppForms(environment.extraArgs),
            uploadContactForms(environment.extraArgs),
            uploadCustomTranslations(),
            uploadAppSettings(api)
        ]
    );
};

let fsEventsSubscription;
let eventQueue;

const cleanUp = async () => {
    if (fsEventsSubscription) {
        await fsEventsSubscription.unsubscribe();
        fsEventsSubscription = undefined;
    }
    if (eventQueue) {
        await eventQueue.clear();
        eventQueue = undefined;
    }
};

const waitForKillSignal = () => {
    return new Promise((resolve) => {
        process.on('SIGINT', async () => {
            await cleanUp();
            resolve();
        });
    });
};

const processAppForm = (fileName) => {
    if (uploadForms.FORM_FILE_MATCHER(fileName)) {
        eventQueue.enqueue(async () => {
            await uploadAppForms([fileName.split('.')[0]]);
            return fileName;
        });
        return true;
    }
    if (convertForms.FORM_FILE_MATCHER(fileName)) {
        eventQueue.enqueue(async () => {
            await convertAppForms([fileName.split('.')[0]]);
            return fileName;
        });
        return true;
    }
    return false;
};

const processAppFormMedia = (formMediaDir, fileName) => {
    if (formMediaDir && formMediaDir.match(formMediaRegex)) {
        eventQueue.enqueue(async () => {
            await uploadAppForms([formMediaDir.split('-')[0]]);
            return fileName;
        });
        return true;
    }
    return false;
};

const processContactForm = (fileName) => {
    if (convertForms.FORM_FILE_MATCHER(fileName)) {
        eventQueue.enqueue(async () => {
            await convertContactForm([fileName.split('.')[0]]);
            return fileName;
        });
        return true;
    }
    if (uploadForms.FORM_FILE_MATCHER(fileName)) {
        eventQueue.enqueue(async () => {
            await uploadContactForms([fileName.split('.')[0]]);
            return fileName;
        });
        return true;
    }
    return false;
};

const processConfigFiles = (api, fileName) => {
    if (fileName === 'app_settings.json') {
        eventQueue.enqueue(async () => {
            await uploadAppSettings(api);
            return fileName;
        });
        return true;
    }
    if (fileName.match(/.+\.js$/) || fileName.match(/^[\w]+\.json$/)) {
        eventQueue.enqueue(async () => {
            await compileAppSettings();
            return fileName;
        });
        return true;
    }
    return false;
};

const watchProject = {
    watch: async (api, blockFn, callback = {}, uploadStateOnStart = false) => {
        if (uploadStateOnStart) {
            await uploadInitialState(api);
            info('Initial State Uploaded');
        }

        eventQueue = new Queue({ concurrent: 1, start: true });

        fsEventsSubscription = await watcher.subscribe(environment.pathToProject, async (err, events) => {
            if (err) {
                error(err);
                return;
            }
            for (const event of events) {
                if (event.type !== 'update' && event.type !== 'create') {
                    continue;
                }
                const changePath = event.path;
                const parsedPath = path.parse(changePath);

                if (parsedPath.dir.replace(environment.pathToProject, '').startsWith(`/${APP_FORMS_PATH}`)) {
                    const relativeFormsDir = parsedPath.dir.replace(environment.pathToProject, '');
                    const fileName = parsedPath.base;
                    if (!processAppForm(fileName) && !relativeFormsDir.endsWith(APP_FORMS_PATH)) {
                        const formMediaDir = relativeFormsDir.replace(relativeFormsDir, '');
                        processAppFormMedia(formMediaDir, fileName);
                    }
                    continue;
                }

                if (parsedPath.dir === path.join(environment.pathToProject, CONTACT_FORMS_PATH)) {
                    const fileName = parsedPath.base;
                    processContactForm(fileName);
                    continue;
                }

                if (parsedPath.dir === path.join(environment.pathToProject, TRANSLATIONS_PATH)) {
                    await uploadCustomTranslations();
                    const fileName = parsedPath.base;
                    if (callback) callback(fileName);
                    continue;
                }

                if (parsedPath.dir === path.join(environment.pathToProject, APP_SETTINGS_DIR)) {
                    const fileName = parsedPath.base;
                    processConfigFiles(api, fileName);
                    continue;
                }

                if (parsedPath.dir === environment.pathToProject && parsedPath.base !== RESOURCE_CONFIG_PATH) {
                    const fileName = parsedPath.base;
                    processConfigFiles(api, fileName);
                    continue;
                }

                if (parsedPath.base === RESOURCE_CONFIG_PATH || parsedPath.dir === path.join(environment.pathToProject, RESOURCES_DIR_PATH)) {
                    await uploadResources();
                    const fileName = parsedPath.base;
                    if (callback) callback(fileName);
                    continue;
                }
            }
        });

        eventQueue.on('resolve', file => {
            if (callback) {
                callback(file);
            }
        });
        eventQueue.on('reject', err => error(err));

        info('watching', environment.pathToProject, 'for changes');
        await blockFn();
    },
    close: async () => {
        info('stopping watchers');
        await cleanUp();
    }
};

const api = require('../lib/api');
module.exports = {
    watchProject,
    requiresInstance: true,
    execute: () => watchProject.watch(api(), waitForKillSignal, false, true)
};
