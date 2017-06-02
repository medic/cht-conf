const uploadForms = require('../lib/upload-forms');

module.exports = (project, couchUrl, extras) => uploadForms(project, couchUrl, 'contact', {
  id_prefix: 'contact:',
  forms: extras,
  default_context: { person:false, place:false },
});
