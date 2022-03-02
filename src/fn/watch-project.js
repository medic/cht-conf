const environment = require('../lib/environment');
const process = require('process');
const path = require('path');
const { error, info } = require('../lib/log');
const Queue = require('queue-promise');
const watcher = require('@parcel/watcher');
const convertForms = require('../lib/convert-forms');
const uploadForms = require('../lib/upload-forms');
const convertContactForm = require('./convert-contact-forms').execute;
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
            uploadForms(environment.pathToProject, 'app'),
            uploadForms(environment.pathToProject, 'contact', { id_prefix: 'contact:', default_context: { person: false, place: false } }),
            uploadCustomTranslations(),
            uploadAppSettings(api)
        ]
    );
};

let fsEventsSubscription;
let eventQueue;

const cleanUp = async () => {
    if (fsEventsSubscription) await fsEventsSubscription.unsubscribe();
    if(eventQueue) await eventQueue.clear();
};

const waitForKillSignal = () => {
    return new Promise((resolve) => {
        process.on('SIGINT', async () => {
            await cleanUp();
            resolve();
        });
    });
};

const watchProject = {
    watch: async (api, blockFn, callback = {}, uploadStateOnStart = false) => {
        if (uploadStateOnStart) {
            await uploadInitialState(api).then(() => info('Initial State Uploaded'));
        }

        const appFormsPath = path.join(environment.pathToProject, 'forms', 'app');
        const contactFormsPath = path.join(environment.pathToProject, 'forms', 'contact');
        eventQueue =  new Queue({ concurrent: 1, start: true });

        fsEventsSubscription = await watcher.subscribe(environment.pathToProject, async (err, events) => {
            if (err) {
                error(err);
                return;
            }
            for (const event of events) {
                if (!(event.type === 'update' || event.type === 'create')) {
                    continue;
                }
                const changePath = event.path;
                const parsedPath = path.parse(changePath);

                if (parsedPath.dir.startsWith(appFormsPath)) {
                    const fileName = parsedPath.base;
                    if (fileName.match(formXMLRegex) || fileName.match(formPropertiesRegex)) {
                        eventQueue.enqueue(() => {
                            return uploadForms(environment.pathToProject, 'app', {
                                forms: [fileName.split('.')[0]],
                            }).then(() => Promise.resolve(fileName));
                        });
                        continue;
                    }
                    if (fileName.match(formXLSRegex)) {
                        eventQueue.enqueue(() => {
                            return convertForms(environment.pathToProject, 'app', {
                                enketo: true,
                                forms: [fileName.split('.')[0]],
                                transformer: xml => xml.replace('</instance>', '</instance>\n      <instance id="contact-summary"/>'),
                            }).then(() => Promise.resolve(fileName));
                        });
                        continue;
                    }
                    const formMediaDir = parsedPath.dir.replace(appFormsPath, '');
                    if (formMediaDir && formMediaDir.match(formMediaRegex)) {
                        eventQueue.enqueue(() => {
                            return uploadForms(environment.pathToProject, 'app', {
                                forms: [formMediaDir.split('-')[0]],
                            }).then(() => Promise.resolve(fileName));
                        });
                        continue;
                    }
                    continue;
                }

                if (parsedPath.dir === contactFormsPath) {
                    const fileName = parsedPath.base;
                    if (fileName.match(formXLSRegex)) {
                        eventQueue.enqueue(() => {
                            return convertContactForm(environment.pathToProject, [fileName.split('.')[0]])
                                .then(() => Promise.resolve(fileName));
                        });
                        continue;
                    }
                    if (fileName.match(formXMLRegex)) {
                        eventQueue.enqueue(() => {
                            return uploadForms(environment.pathToProject, 'contact', {
                                id_prefix: 'contact:',
                                forms: [fileName.split('.')[0]],
                                default_context: { person: false, place: false },
                            }).then(() => Promise.resolve(fileName));
                        });
                        continue;
                    }
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

                if ((parsedPath.dir === environment.pathToProject && parsedPath.base !== 'resources.json')
                    || parsedPath.dir === path.join(environment.pathToProject, 'app_settings')) {
                    const fileName = parsedPath.base;
                    if (fileName.match(/.+\.js$/) || fileName.match(/^[\w]+\.json$/)) {
                        await compileAppSettings();
                        await uploadAppSettings(api);
                        if (callback) callback(fileName);
                        continue;
                    }
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
