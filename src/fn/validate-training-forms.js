const validateForms = require('../lib/validate-forms');
const environment = require('../lib/environment');

const validateTrainingForms = (forms) => {
  return validateForms(environment.pathToProject, 'training', { forms });
};

module.exports = {
  requiresInstance: false,
  validateTrainingForms,
  execute: () => validateTrainingForms(environment.extraArgs)
};
