const uploadForms = require('../lib/upload-forms');

module.exports = (projectDir, couchUrl, extras) => uploadForms(projectDir, couchUrl, 'collect', {
  forms: extras,
  default_context: { collect:true },
});
