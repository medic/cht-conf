const uploadForms = require('../lib/upload-forms');

module.exports = (project, couchUrl, extras) => uploadForms(project, couchUrl, 'collect', {
  forms: extras,
  default_context: { collect:true },
});
