const convertForms = require('../lib/convert-forms');

module.exports = (projectDir, couchUrl, extras) => convertForms(projectDir, 'app', {
  forms: extras,
});
