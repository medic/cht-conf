const uploadForms = require('../lib/upload-forms');

module.exports = (projectDir, db, api, extras) => uploadForms(projectDir, db, 'collect', {
  forms: extras,
  default_context: { collect:true },
});
