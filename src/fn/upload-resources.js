const fs = require('../lib/sync-fs');
const { warn } = require('../lib/log');
const insertOrReplace = require('../lib/insert-or-replace');

const attachmentsFromDir = require('../lib/attachments-from-dir');

module.exports = (projectDir, db) => {
  const resourcesPath = fs.path.resolve(`${projectDir}/resources.json`);

  if(!fs.exists(resourcesPath)) {
    warn(`No resources file found at path: ${resourcesPath}`);
    return Promise.resolve();
  }

  return insertOrReplace(db, {
    _id: 'resources',
    resources: fs.readJson(resourcesPath),
    _attachments: attachmentsFromDir(`${projectDir}/resources`),
  });
};
