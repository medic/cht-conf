const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms').execute;

const uploadAppForms = (forms) => {
  return uploadForms(environment.pathToProject, 'app', {
    forms: forms,
  });
};

module.exports = {
  requiresInstance: true,
  uploadAppForms,
  execute: () => uploadAppForms(environment.extraArgs)
};
