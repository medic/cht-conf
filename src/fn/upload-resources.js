const fs = require('../lib/sync-fs');
const skipFn = require('../lib/skip-fn');
const warn = require('../lib/log').warn;
const pouchHttp = require('../lib/remote-db');

const attachmentsFromDir = require('../lib/attachments-from-dir');
const insertOrReplace = require('../lib/insert-or-replace');

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  const resourcesPath = fs.path.resolve(`${projectDir}/resources.json`);

  if(!fs.exists(resourcesPath)) {
    warn(`No resources file found at path: ${resourcesPath}`);
    return Promise.resolve();
  }

  const db = pouchHttp(couchUrl);

  return insertOrReplace(db, {
    _id: 'resources',
    resources: fs.readJson(resourcesPath),
    _attachments: attachmentsFromDir(`${projectDir}/resources`),
  });
};
