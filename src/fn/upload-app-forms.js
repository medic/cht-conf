const uploadForms = require('../lib/upload-forms');

module.exports = (projectDir, db, api, extras) => uploadForms(projectDir, db, 'app', {
  forms: extras,
});
