const environment = require('../lib/environment');
const uploadConfigurationDocs = require('../lib/upload-configuration-docs');
const { validateBranding } = require('../lib/validate-configuration-docs');

module.exports = {
  requiresInstance: true,
  execute: () => {
    const configurationPath = `${environment.pathToProject}/branding.json`;
    const directoryPath = `${environment.pathToProject}/branding`;

    return uploadConfigurationDocs(configurationPath, directoryPath, 'branding', undefined, validateBranding);
  }
};
