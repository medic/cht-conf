const uploadForms = require('../lib/upload-forms');

module.exports = (projectDir, apiUrl, extras) => uploadForms(projectDir, apiUrl, 'app', {
  forms: extras,
});
