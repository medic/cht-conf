const attachmentsFromDir = require('../lib/attachments-from-dir');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const { warn } = require('../lib/log');
const insertOrReplace = require('../lib/insert-or-replace');

module.exports = (projectDir, apiUrl) => {
  const db = pouch(apiUrl);
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
