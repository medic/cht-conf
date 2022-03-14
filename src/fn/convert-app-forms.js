const convertForms = require('../lib/convert-forms').execute;
const environment = require('../lib/environment');
const path = require('path');

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
  APP_FORMS_PATH: path.join('forms', 'app'),
  execute: () => convertAppForms(environment.extraArgs)
};
