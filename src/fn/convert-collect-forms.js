const convertForms = require('../lib/convert-forms');

module.exports = (projectDir, db, api, extras) => convertForms(projectDir, 'collect', {
  forms: extras,
});
