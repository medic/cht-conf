const attachmentsFromDir = require('../lib/attachments-from-dir');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const { warn } = require('../lib/log');
const insertOrReplace = require('../lib/insert-or-replace');

module.exports = () => {
  const resourcesPath = fs.path.resolve(`${environment.pathToProject}/resources.json`);

  if(!fs.exists(resourcesPath)) {
    warn(`No resources file found at path: ${resourcesPath}`);
    return Promise.resolve();
  }

  return insertOrReplace(pouch(), {
    _id: 'resources',
    resources: fs.readJson(resourcesPath),
    _attachments: attachmentsFromDir(`${environment.pathToProject}/resources`),
  });
};
