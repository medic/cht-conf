const environment = require('../lib/environment');
const process = require('process');
const path = require('path');
const { error, info } = require('../lib/log');
const Queue = require('queue-promise');
const watcher = require('@parcel/watcher');
const { uploadAppForms } = require('./upload-app-forms');
const { uploadContactForms } = require('./upload-contact-forms');
const { convertAppForms } = require('./convert-app-forms');
const { convertContactForm } = require('./convert-contact-forms');
const { uploadAppSettings } = require('./upload-app-settings');
const compileAppSettings = require('./compile-app-settings').execute;
const uploadCustomTranslations = require('./upload-custom-translations').execute;
const uploadResources = require('./upload-resources').execute;

const formXLSRegex = /^[a-zA-Z0-9_-]+\.xlsx$/;
const formPropertiesRegex = /^[a-zA-Z0-9_-]+\.properties.json$/;
const formMediaRegex = /^[a-zA-Z0-9_]+(?:-media)$/;
const formXMLRegex = /^[a-zA-Z0-9_-]+\.xml$/;

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
    if (fileName.match(formXMLRegex) || fileName.match(formPropertiesRegex)) {
        eventQueue.enqueue(async () => {
            await uploadAppForms([fileName.split('.')[0]]);
            return fileName;
        });
        return true;
    }
    if (fileName.match(formXLSRegex)) {
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
    if (fileName.match(formXLSRegex)) {
        eventQueue.enqueue(async () => {
            await convertContactForm([fileName.split('.')[0]]);
            return fileName;
        });
        return true;
    }
    if (fileName.match(formXMLRegex)) {
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

        const appFormsPath = path.join(environment.pathToProject, 'forms', 'app');
        const contactFormsPath = path.join(environment.pathToProject, 'forms', 'contact');
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

                if (parsedPath.dir.startsWith(appFormsPath)) {
                    const fileName = parsedPath.base;
                    if (!processAppForm(fileName)) {
                        const formMediaDir = parsedPath.dir.replace(appFormsPath, '');
                        processAppFormMedia(formMediaDir, fileName);
                    }
                    continue;
                }

                if (parsedPath.dir === contactFormsPath) {
                    const fileName = parsedPath.base;
                    processContactForm(fileName);
                    continue;
                }

                if (parsedPath.dir === path.join(environment.pathToProject, 'translations')) {
                    const fileName = parsedPath.base;
                    if (fileName.match(/messages-[\w]+\.properties/)) {
                        await uploadCustomTranslations();
                        if (callback) callback(fileName);
                        continue;
                    }
                    continue;
                }

                if (parsedPath.dir === path.join(environment.pathToProject, 'app_settings')) {
                    const fileName = parsedPath.base;
                    processConfigFiles(api, fileName);
                    continue;
                }

                if (parsedPath.dir === environment.pathToProject && parsedPath.base !== 'resources.json') {
                    const fileName = parsedPath.base;
                    processConfigFiles(api, fileName);
                    continue;
                }

                if (parsedPath.base === 'resources.json' || parsedPath.dir === path.join(environment.pathToProject, 'resources')) {
                    const fileName = parsedPath.base;
                    await uploadResources();
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
