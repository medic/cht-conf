const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms');

module.exports = () => uploadForms(environment.pathToProject, 'collect', {
  forms: environment.extraArgs,
  default_context: { collect:true },
});
