const convertForms = require('../lib/convert-forms');
const environment = require('../lib/environment');

const convertAppForms = (forms) => {
  return convertForms(environment.pathToProject, 'app', {
    enketo: true,
    forms: forms,
    transformer: xml => xml.replace('</instance>', '</instance>\n      <instance id="contact-summary"/>'),
  });
};

module.exports = {
  requiresInstance: false,
  convertAppForms,
  execute: () => convertAppForms(environment.extraArgs)
};
