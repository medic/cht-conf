const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms').execute;

const uploadContactForms = (forms) => {
  return uploadForms(environment.pathToProject, 'contact', {
    id_prefix: 'contact:',
    forms: forms,
    default_context: { person: false, place: false },
  });
};

module.exports = {
  requiresInstance: true,
  uploadContactForms,
  execute: () => uploadContactForms(environment.extraArgs)
};
