const convertForms = require('../lib/convert-forms').execute;
const environment = require('../lib/environment');
const { APP_FORMS_PATH } = require('../lib/project-paths');

const convertTrainingForms = (forms) => {
  return convertForms(environment.pathToProject, 'training', {
    enketo: true,
    forms: forms,
  });
};

module.exports = {
  requiresInstance: false,
  convertTrainingForms,
  APP_FORMS_PATH,
  execute: () => convertTrainingForms(environment.extraArgs)
};
