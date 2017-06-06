const convertForms = require('../lib/convert-forms');

module.exports = (project, couchUrl, extras) => convertForms(project, 'app', {
  forms: extras,
});
