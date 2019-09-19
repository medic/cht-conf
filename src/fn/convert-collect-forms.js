const convertForms = require('../lib/convert-forms');

module.exports = (projectDir, apiUrl, extras) => convertForms(projectDir, 'collect', {
  forms: extras,
});
