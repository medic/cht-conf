const convertForms = require('../lib/convert-forms');

module.exports = (projectDir, repository, extras) => convertForms(projectDir, 'app', {
  enketo: true,
  forms: extras,
  transformer: xml => xml.replace('</instance>', '</instance>\n      <instance id="contact-summary"/>'),
});
