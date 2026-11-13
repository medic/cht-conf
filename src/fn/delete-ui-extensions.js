const uiExtensionsLib = require('../lib/ui-extensions');
const environment = require('../lib/environment');

const executeDeleteUiExtensions = async () => {
  const specifiedExtensions = environment.extraArgs?.filter(arg => !arg.startsWith('--')) ?? [];
  await uiExtensionsLib.deleteUiExtensions(specifiedExtensions);
};

module.exports = {
  requiresInstance: true,
  execute: executeDeleteUiExtensions
};
