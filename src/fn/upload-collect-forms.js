const uploadForms = require('../lib/upload-forms');

module.exports = (projectDir, apiUrl, extras) => uploadForms(projectDir, apiUrl, 'collect', {
  forms: extras,
  default_context: { collect:true },
});
