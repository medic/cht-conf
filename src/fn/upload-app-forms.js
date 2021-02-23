const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms');
const validateForms = require('../lib/validate-forms');

module.exports = {
  requiresInstance: true,
  validate: () => validateForms(environment.pathToProject, 'app', {
    forms: environment.extraArgs,
  }),
  execute: () => uploadForms(environment.pathToProject, 'app', {
    forms: environment.extraArgs,
  })
};
