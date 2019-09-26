const uploadForms = require('../lib/upload-forms');

module.exports = (projectDir, couchUrl, extras) => uploadForms(projectDir, couchUrl, 'app', {
  forms: extras,
});
