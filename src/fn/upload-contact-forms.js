const uploadForms = require('../lib/upload-forms');

module.exports = (projectDir, db, api, extras) => uploadForms(projectDir, db, 'contact', {
  id_prefix: 'contact:',
  forms: extras,
  default_context: { person:false, place:false },
});
