const validateForms = require('../lib/validate-forms');
const environment = require('../lib/environment');

const validateContactForms = (forms) => {
  return validateForms(environment.pathToProject, 'contact', { forms });
};

module.exports = {
  requiresInstance: false,
  validateContactForms,
  execute: () => validateContactForms(environment.extraArgs)
};
