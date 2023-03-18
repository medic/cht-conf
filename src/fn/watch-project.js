const environment = require('../lib/environment');
const process = require('process');
const path = require('path');
const fs = require('fs');
const { error, warn, info } = require('../lib/log');
const Queue = require('queue-promise');
const watcher = require('@parcel/watcher');
const { validateAppForms } = require('./validate-app-forms');
const { validateContactForms } = require('./validate-contact-forms');
const { validateCollectForms } = require('./validate-collect-forms');
const { validateTrainingForms } = require('./validate-training-forms');
const { uploadAppForms } = require('./upload-app-forms');
const { uploadContactForms } = require('./upload-contact-forms');
const { uploadCollectForms } = require('./upload-collect-forms');
const { uploadTrainingForms } = require('./upload-training-forms');
const convertForms = require('../lib/convert-forms');
const uploadForms = require('../lib/upload-forms');
const { deleteForms } = require('../fn/delete-forms');
const { convertAppForms, APP_FORMS_PATH } = require('./convert-app-forms');
const { convertContactForm, CONTACT_FORMS_PATH } = require('./convert-contact-forms');
const { convertTrainingForms, TRAINING_FORMS_PATH } = require('./convert-training-forms');
const { convertCollectForms, COLLECT_FORMS_PATH } = require('./convert-collect-forms');
const { uploadAppSettings, APP_SETTINGS_DIR_PATH, APP_SETTINGS_JSON_PATH } = require('./upload-app-settings');
const { execute: compileAppSettings, configFileMatcher } = require('./compile-app-settings');
const { execute: uploadCustomTranslations, TRANSLATIONS_DIR_PATH } = require('./upload-custom-translations');
const { execute: uploadResources, RESOURCES_DIR_PATH, RESOURCE_CONFIG_PATH } = require('./upload-resources');

const watcherEvents = {
    CreateEvent: 'create',
    DeleteEvent: 'delete',
    UpdateEvent: 'update'
};

const runValidation = (validation, forms) => {
    if(environment.skipValidate) {
        return;
    }
    return validation(forms);
};

const uploadInitialState = async (api) => {
    await uploadResources();
    await runValidation(validateAppForms, environment.extraArgs);
    await runValidation(validateContactForms, environment.extraArgs);
    await runValidation(validateTrainingForms, environment.extraArgs);
    await uploadAppForms(environment.extraArgs);
    await uploadContactForms(environment.extraArgs);
    await uploadTrainingForms(environment.extraArgs);
    await uploadCustomTranslations();
    await uploadAppSettings(api);
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

const deleteForm = (fileName, formDir) => {
    const form = uploadForms.formFileMatcher(fileName) || convertForms.formFileMatcher(fileName);
    if (!form) {
        return false;
    }
    const absFormDirPath = path.join(environment.pathToProject, formDir);
    const formFiles = fs.readdirSync(absFormDirPath).map(file => (uploadForms.formFileMatcher(file) || convertForms.formFileMatcher(file))).filter(_form => _form === form);
    const canDelete = formFiles.length <= 0;
    if (canDelete) {
        eventQueue.enqueue(async () => {
            await deleteForms([form]);
            return fileName;
        });
        return true;
    }
    warn(`You have to delete all form files (.xlsx, .properties.json, .xml) associated with the ${form} form to delete it from ${environment.apiUrl}`);
    return false;
};

const getFormCommandContext = (parsedPath) => {
    if (parsedPath.dir === path.join(environment.pathToProject, APP_FORMS_PATH)) {
        return {
            path: APP_FORMS_PATH,
            validateForms: validateAppForms,
            uploadForms: uploadAppForms,
            convertForms: convertAppForms,
        };
    }

    if (parsedPath.dir === path.join(environment.pathToProject, TRAINING_FORMS_PATH)) {
        return {
            path: TRAINING_FORMS_PATH,
            validateForms: validateTrainingForms,
            uploadForms: uploadTrainingForms,
            convertForms: convertTrainingForms,
        };
    }

    if (parsedPath.dir === path.join(environment.pathToProject, CONTACT_FORMS_PATH)) {
        return {
            path: CONTACT_FORMS_PATH,
            validateForms: validateContactForms,
            uploadForms: uploadContactForms,
            convertForms: convertContactForm,
        };
    }

    if (parsedPath.dir === path.join(environment.pathToProject, COLLECT_FORMS_PATH)) {
        return {
            path: COLLECT_FORMS_PATH,
            validateForms: validateCollectForms,
            uploadForms: uploadCollectForms,
            convertForms: convertCollectForms,
        };
    }

    return;
};

const processForm = (eventType, fileName, commandContext) => {
    if (eventType === watcherEvents.DeleteEvent && deleteForm(fileName, commandContext.path)) {
        return true;
    }
    let form = uploadForms.formFileMatcher(fileName);
    if (form) {
        eventQueue.enqueue(async () => {
            await runValidation(commandContext.validateForms, [form]);
            await commandContext.uploadForms([form]);
            return fileName;
        });
        return true;
    }

    form = convertForms.formFileMatcher(fileName);
    if (form) {
        eventQueue.enqueue(async () => {
            await commandContext.convertForms([form]);
            return fileName;
        });
        return true;
    }
    return false;
};

const getFormMediaCommandContext = (parsedPath) => {
    if (parsedPath.dir.startsWith(path.join(environment.pathToProject, APP_FORMS_PATH))
      && path.parse(parsedPath.dir).dir.endsWith(APP_FORMS_PATH)) {
        // Check if the directory's immediate parent is forms/app
        return {
            validateForms: validateAppForms,
            uploadForms: uploadAppForms,
        };
    }

    if (parsedPath.dir.startsWith(path.join(environment.pathToProject, TRAINING_FORMS_PATH))
      && path.parse(parsedPath.dir).dir.endsWith(TRAINING_FORMS_PATH)) {
        // Check if the directory's immediate parent is forms/training
        return {
            validateForms: validateTrainingForms,
            uploadForms: uploadTrainingForms,
        };
    }

    return;
};

const processFormMedia = (formMediaDir, fileName, commandContext) => {
    const form = uploadForms.formMediaMatcher(formMediaDir);
    if (form) {
        eventQueue.enqueue(async () => {
            await runValidation(commandContext.validateForms,[form]);
            await commandContext.uploadForms([form]);
            return fileName;
        });
        return true;
    }
    return false;
};

const processConfigFiles = (api, fileName) => {
    if (fileName === APP_SETTINGS_JSON_PATH) {
        eventQueue.enqueue(async () => {
            await uploadAppSettings(api);
            return fileName;
        });
        return true;
    }
    if (configFileMatcher(fileName)) {
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
                const changePath = event.path;
                const parsedPath = path.parse(changePath);
                const fileName = parsedPath.base;

                const formContext = getFormCommandContext(parsedPath);
                if (formContext) {
                    processForm(event.type, fileName, formContext);
                    continue;
                }

                const formMediaContext = getFormMediaCommandContext(parsedPath);
                if (formMediaContext) {
                    const dirName = path.parse(parsedPath.dir).base;
                    processFormMedia(dirName, fileName, formMediaContext);
                    continue;
                }

                if (parsedPath.dir === path.join(environment.pathToProject, TRANSLATIONS_DIR_PATH)) {
                    eventQueue.enqueue(async () => {
                        await uploadCustomTranslations();
                        return fileName;
                    });
                    continue;
                }

                if (parsedPath.dir === path.join(environment.pathToProject, APP_SETTINGS_DIR_PATH)) {
                    processConfigFiles(api, fileName);
                    continue;
                }

                if (parsedPath.dir === environment.pathToProject && parsedPath.base !== RESOURCE_CONFIG_PATH) {
                    processConfigFiles(api, fileName);
                    continue;
                }

                if (parsedPath.base === RESOURCE_CONFIG_PATH || parsedPath.dir === path.join(environment.pathToProject, RESOURCES_DIR_PATH)) {
                    eventQueue.enqueue(async () => {
                        await uploadResources();
                        return fileName;
                    });
                    continue;
                }
            }
        });

        eventQueue.on('resolve', file => {
            if (callback) {
                callback(file);
            }
        });
        eventQueue.on('reject', err => error('watch-mode: Error while processing change,', err));

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
