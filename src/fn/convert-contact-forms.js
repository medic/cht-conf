const convertForms = require('../lib/convert-forms');

module.exports = (projectDir, couchUrl, extras) => convertForms(projectDir, 'contact', {
  enketo: true,
  force_data_node: 'data',
  forms: extras,
});
