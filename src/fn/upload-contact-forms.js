const uploadForms = require('../lib/upload-forms');

module.exports = (projectDir, couchUrl, extras) => uploadForms(projectDir, couchUrl, 'contact', {
  id_prefix: 'contact:',
  forms: extras,
  default_context: { person:false, place:false },
});
