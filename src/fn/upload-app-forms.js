const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms');

module.exports = () => uploadForms(environment.pathToProject, environment.apiUrl, 'app', {
  forms: environment.extraArgs,
});
