const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms').execute;
const { APP_FORMS_PATH } = require('../lib/project-paths');

const uploadAppForms = (forms) => {
  return uploadForms(environment.pathToProject, 'app', {
    forms: forms,
  });
};

module.exports = {
  requiresInstance: true,
  uploadAppForms,
  APP_FORMS_PATH: APP_FORMS_PATH,
  execute: () => uploadAppForms(environment.extraArgs)
};
