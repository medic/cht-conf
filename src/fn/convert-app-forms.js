const convertForms = require('../lib/convert-forms');

module.exports = (projectDir, couchUrl, extras) => convertForms(projectDir, 'app', {
  forms: extras,
  transformer: xml => xml.replace('</instance>', '</instance>\n      <instance id="contact-summary"/>'),
});
