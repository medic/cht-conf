const environment = require('../lib/environment');
const uploadConfigurationDocs = require('../lib/upload-configuration-docs');

const processJson = (json) => {
  return {
    resources: json
  };
};

function uploadResources(pathToProject) {
  const configurationPath = `${pathToProject}/resources.json`;
  const directoryPath = `${pathToProject}/resources`;
  return uploadConfigurationDocs(configurationPath, directoryPath, 'resources', processJson);
}

module.exports = {
  uploadResources,
  requiresInstance: true,
  execute: () => uploadResources(environment.pathToProject)
};
