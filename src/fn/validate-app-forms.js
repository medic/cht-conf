const validateForms = require('../lib/validate-forms');
const environment = require('../lib/environment');

module.exports = {
  requiresInstance: false,
  execute: () => validateForms(environment.pathToProject, 'app', { forms: environment.extraArgs })
};
