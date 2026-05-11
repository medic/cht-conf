const uiExtensionsLib = require('../lib/ui-extensions');
const environment = require('../lib/environment');

const executeDeleteUiExtensions = async () => {
  let specificExtensions = [];

  if (environment.extraArgs?.length) {
    specificExtensions = environment.extraArgs.filter(arg => !arg.startsWith('--'));
  }

  await uiExtensionsLib.deleteUiExtensions(specificExtensions);
};

module.exports = {
  requiresInstance: true,
  execute: executeDeleteUiExtensions
};
