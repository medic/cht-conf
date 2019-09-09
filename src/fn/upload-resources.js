const fs = require('../lib/sync-fs');
const { warn } = require('../lib/log');

const attachmentsFromDir = require('../lib/attachments-from-dir');

module.exports = (projectDir, repository) => {
  const resourcesPath = fs.path.resolve(`${projectDir}/resources.json`);

  if(!fs.exists(resourcesPath)) {
    warn(`No resources file found at path: ${resourcesPath}`);
    return Promise.resolve();
  }

  return repository.insertOrReplace({
    _id: 'resources',
    resources: fs.readJson(resourcesPath),
    _attachments: attachmentsFromDir(`${projectDir}/resources`),
  });
};
