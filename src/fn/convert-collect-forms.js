const convertForms = require('../lib/convert-forms/convert-forms').execute;
const environment = require('../lib/environment');
const { COLLECT_FORMS_PATH } = require('../lib/project-paths');

const convertCollectForms = (forms) => {
  return convertForms(environment.pathToProject, 'collect', {
    forms: forms,
  });
};

module.exports = {
  requiresInstance: false,
  COLLECT_FORMS_PATH,
  convertCollectForms,
  execute: () => convertCollectForms(environment.extraArgs)
};
