const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms');
const validateForms = require('../lib/validate-forms');

module.exports = {
  requiresInstance: true,
  validate: () => validateForms(environment.pathToProject, 'contact', {
    id_prefix: 'contact:',
    forms: environment.extraArgs,
    default_context: { person:false, place:false },
  }),
  execute: () => uploadForms(environment.pathToProject, 'contact', {
    id_prefix: 'contact:',
    forms: environment.extraArgs,
    default_context: { person:false, place:false },
  })
};
