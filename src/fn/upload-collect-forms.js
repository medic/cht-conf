const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms').execute;

module.exports = {
  requiresInstance: true,
  execute: () => uploadForms(environment.pathToProject, 'collect', {
    forms: environment.extraArgs,
    default_context: { collect: true },
  })
};
