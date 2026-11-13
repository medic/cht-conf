const projectPaths = require('../lib/project-paths');
const uploadUiExtensionsLib = require('../lib/ui-extensions');
const environment = require('../lib/environment');


const executeUploadUiExtensions = async () => {
  const uiExtensionsDir = `${environment.pathToProject}/${projectPaths.UI_EXTENSIONS_PATH}`;
  const specifiedExtensions = environment.extraArgs?.filter(arg => !arg.startsWith('--')) ?? [];
  await uploadUiExtensionsLib.uploadUiExtensions(uiExtensionsDir, specifiedExtensions);
};

module.exports = {
  requiresInstance: true,
  execute: executeUploadUiExtensions
};
