const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms').execute;
const { TRAINING_FORMS_PATH } = require('../lib/project-paths');

const uploadTrainingForms = (forms) => {
  return uploadForms(environment.pathToProject, 'training', {
    id_prefix: 'training:',
    forms: forms,
  });
};

module.exports = {
  requiresInstance: true,
  uploadTrainingForms,
  TRAINING_FORMS_PATH,
  execute: () => uploadTrainingForms(environment.extraArgs)
};
