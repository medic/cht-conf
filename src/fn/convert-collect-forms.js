const convertForms = require('../lib/convert-forms');
const environment = require('../lib/environment');

module.exports = () => convertForms(environment.pathToProject, 'collect', {
  forms: environment.extraArgs,
});
