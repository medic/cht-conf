const convertForms = require('../lib/convert-forms').execute;
const environment = require('../lib/environment');
const { APP_FORMS_PATH } = require('../lib/project-paths');

const convertAppForms = (forms) => {
  return convertForms(environment.pathToProject, 'app', {
    enketo: true,
    forms: forms,
    transformer: xml => xml.replace('</instance>', '</instance>\n      <instance id="contact-summary"/>\n      <instance id="user-contact-summary"/>'),
  });
};

module.exports = {
  requiresInstance: false,
  convertAppForms,
  APP_FORMS_PATH,
  execute: () => convertAppForms(environment.extraArgs)
};
