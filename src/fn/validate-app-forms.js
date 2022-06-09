const validateForms = require('../lib/validate-forms');
const environment = require('../lib/environment');

const validateAppForms = (forms) => {
  return validateForms(environment.pathToProject, 'app', { forms });
};

module.exports = {
  requiresInstance: false,
  validateAppForms,
  execute: () => validateAppForms(environment.extraArgs)
};
