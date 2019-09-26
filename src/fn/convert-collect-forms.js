const convertForms = require('../lib/convert-forms');

module.exports = (projectDir, couchUrl, extras) => convertForms(projectDir, 'collect', {
  forms: extras,
});
