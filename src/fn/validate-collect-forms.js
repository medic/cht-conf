const validateForms = require('../lib/validate-forms');
const environment = require('../lib/environment');

const validateCollectForms = (forms) => {
  return validateForms(environment.pathToProject, 'collect', { forms });
};

module.exports = {
  requiresInstance: false,
  validateCollectForms,
  execute: () => validateCollectForms(environment.extraArgs)
};
