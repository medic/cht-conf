const uploadForms = require('../lib/upload-forms');

module.exports = (project, couchUrl, extras) => uploadForms(project, couchUrl, 'app', {
  forms: extras,
});
