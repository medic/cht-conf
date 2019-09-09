const convertForms = require('../lib/convert-forms');

module.exports = (projectDir, repository, extras) => convertForms(projectDir, 'collect', {
  forms: extras,
});
