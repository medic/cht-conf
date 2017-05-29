const big_log = (...args) => { require('../lib/log')('!!', ...args); };

const compileAppSettings = require('../fn/compile-app-settings');
const backupAppSettings = require('../fn/backup-app-settings');
const uploadAppSettings = require('../fn/upload-app-settings');
const backupForms = require('../fn/backup-forms');
const deleteForms = require('../fn/delete-forms');
const uploadForms = require('../fn/upload-forms');
const uploadResources = require('../fn/upload-resources');

module.exports = (project, couchUrl) => {
  return Promise.resolve()

    .then(() => big_log(`Uploading project configuration for ${project} to ${couchUrl}...`))

    .then(() => big_log('Compiling app settings...'))
    .then(() => compileAppSettings(project))
    .then(() => big_log('Tasks updated.'))

    .then(() => big_log('Backing up app_settings...'))
    .then(() => backupAppSettings(project, couchUrl))
    .then(() => big_log('App settings backed up.'))

    .then(() => big_log('Uploading app_settings...'))
    .then(() => uploadAppSettings(project, couchUrl))
    .then(() => big_log('app_settings upload complete.'))

    .then(() => big_log('Backing up existing forms...'))
    .then(() => backupForms(project, couchUrl))
    .then(() => big_log('Forms backed up.'))

    .then(() => big_log('Deleting forms...'))
    .then(() => deleteForms(couchUrl))
    .then(() => big_log('Forms deleted.'))

    .then(() => big_log('Uploading forms...'))
    .then(() => uploadForms(project, couchUrl))
    .then(() => big_log('Form upload complete.'))

    .then(() => big_log('Uploading resources...'))
    .then(() => uploadResources(project, couchUrl))
    .then(() => big_log('Resources upload complete.'))

    .then(() => big_log('Project configuration upload complete.'))

    .catch(console.log);

};
