const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms').execute;

const uploadCollectForms = (forms) => {
  return uploadForms(environment.pathToProject, 'collect', {
    forms: forms,
    default_context: { collect: true },
  });
};

module.exports = {
  requiresInstance: true,
  uploadCollectForms,
  execute: () => uploadCollectForms(environment.extraArgs)
};
