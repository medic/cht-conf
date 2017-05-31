const info = require('../lib/log').info;

const compileAppSettings = require('../fn/compile-app-settings');
const backupAppSettings = require('../fn/backup-app-settings');
const uploadAppSettings = require('../fn/upload-app-settings');
const backupForms = require('../fn/backup-forms');
const deleteForms = require('../fn/delete-forms');
const uploadForms = require('../fn/upload-forms');
const uploadResources = require('../fn/upload-resources');
const uploadCustomTranslations = require('../fn/upload-custom-translations');

module.exports = (project, couchUrl) => {
  return Promise.resolve()

    .then(() => info(`Uploading project configuration for ${project} to ${couchUrl}...`))

    .then(() => info('Compiling app settings...'))
    .then(() => compileAppSettings(project, couchUrl))
    .then(() => info('Tasks updated.'))

    .then(() => info('Backing up app_settings...'))
    .then(() => backupAppSettings(project, couchUrl))
    .then(() => info('App settings backed up.'))

    .then(() => info('Uploading app_settings...'))
    .then(() => uploadAppSettings(project, couchUrl))
    .then(() => info('app_settings upload complete.'))

    .then(() => info('Backing up existing forms...'))
    .then(() => backupForms(project, couchUrl))
    .then(() => info('Forms backed up.'))

    .then(() => info('Deleting forms...'))
    .then(() => deleteForms(project, couchUrl))
    .then(() => info('Forms deleted.'))

    .then(() => info('Uploading forms...'))
    .then(() => uploadForms(project, couchUrl))
    .then(() => info('Form upload complete.'))

    .then(() => info('Uploading resources...'))
    .then(() => uploadResources(project, couchUrl))
    .then(() => info('Resources upload complete.'))

    .then(() => info('Uploading custom translations...'))
    .then(() => uploadCustomTranslations(project, couchUrl))
    .then(() => info('Custom translation upload complete.'))

    .then(() => info('Project configuration upload complete.'))

    .catch(e => {
      console.log(e);
      process.exit(1);
    });

};
