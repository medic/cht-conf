const convertForms = require('../lib/convert-forms');

module.exports = (project, couchUrl, extras) => convertForms(project, 'app', {
  force_data_node: 'data',
  forms: extras,
});
