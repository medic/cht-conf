const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms');

module.exports = () => uploadForms(environment.pathToProject, environment.apiUrl, 'collect', {
  forms: environment.extraArgs,
  default_context: { collect:true },
});
