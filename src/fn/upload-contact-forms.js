const uploadForms = require('../lib/upload-forms');

module.exports = (projectDir, repository, extras) => uploadForms(projectDir, repository, 'contact', {
  id_prefix: 'contact:',
  forms: extras,
  default_context: { person:false, place:false },
});
