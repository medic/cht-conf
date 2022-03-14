const environment = require('../lib/environment');
const uploadConfigurationDocs = require('../lib/upload-configuration-docs');

const processJson = (json) => {
  return {
    resources: json
  };
};

const RESOURCE_CONFIG_PATH = 'resources.json';
const RESOURCES_DIR_PATH = 'resources';

module.exports = {
  requiresInstance: true,
  RESOURCE_CONFIG_PATH,
  RESOURCES_DIR_PATH,
  execute: () => {
    const configurationPath = `${environment.pathToProject}/${RESOURCE_CONFIG_PATH}`;
    const directoryPath = `${environment.pathToProject}/${RESOURCES_DIR_PATH}`;

    return uploadConfigurationDocs(configurationPath, directoryPath, 'resources', processJson);
  }
};

