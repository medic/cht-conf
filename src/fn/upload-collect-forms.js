const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms');
const validateForms = require('../lib/validate-forms');

module.exports = {
  requiresInstance: true,
  validate: () => validateForms(environment.pathToProject, 'collect', {
    forms: environment.extraArgs,
    default_context: { collect:true },
  }),
  execute: () => uploadForms(environment.pathToProject, 'collect', {
    forms: environment.extraArgs,
    default_context: { collect:true },
  })
};
