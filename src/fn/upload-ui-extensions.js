const environment = require('../lib/environment');
const projectPaths = require('../lib/project-paths');
const { uploadUiExtensions } = require('../lib/upload-ui-extensions');

module.exports = {
  requiresInstance: true,
  execute: async () => {
    const uiExtensionsDir = `${environment.pathToProject}/${projectPaths.UI_EXTENSIONS_PATH}`;

    let specificExtensions = [];
    if (environment.extraArgs?.length) {
      specificExtensions = environment.extraArgs.filter(arg => !arg.startsWith('--'));
    }

    await uploadUiExtensions(uiExtensionsDir, specificExtensions);
  }
};
