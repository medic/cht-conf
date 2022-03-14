const convertForms = require('../lib/convert-forms').execute;
const environment = require('../lib/environment');

module.exports = {
  requiresInstance: false,
  execute: () => convertForms(environment.pathToProject, 'collect', {
    forms: environment.extraArgs,
  })
};
