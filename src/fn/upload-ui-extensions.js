const projectPaths = require('../lib/project-paths');
const uploadUiExtensionsLib = require('../lib/upload-ui-extensions');
const environment = require('../lib/environment');


const executeUploadUiExtensions = async () => {
  const uiExtensionsDir = `${environment.pathToProject}/${projectPaths.UI_EXTENSIONS_PATH}`;

  let specificExtensions = [];
  if (environment.extraArgs?.length) {
    specificExtensions = environment.extraArgs.filter(arg => !arg.startsWith('--'));
  }

  await uploadUiExtensionsLib.uploadUiExtensions(uiExtensionsDir, specificExtensions);
};

module.exports = {
  requiresInstance: true,
  execute: executeUploadUiExtensions
};
