const uploadForms = require('../lib/upload-forms');

module.exports = (projectDir, apiUrl, extras) => uploadForms(projectDir, apiUrl, 'contact', {
  id_prefix: 'contact:',
  forms: extras,
  default_context: { person:false, place:false },
});
