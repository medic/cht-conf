const uploadForms = require('../lib/upload-forms');

module.exports = (projectDir, repository, extras) => uploadForms(projectDir, repository, 'collect', {
  forms: extras,
  default_context: { collect:true },
});
