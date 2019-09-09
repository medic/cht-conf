const uploadForms = require('../lib/upload-forms');

module.exports = (projectDir, repository, extras) => uploadForms(projectDir, repository, 'app', {
  forms: extras,
});
