const attachmentsFromDir = require('../lib/attachments-from-dir');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const { warn } = require('../lib/log');
const insertOrReplace = require('../lib/insert-or-replace');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');

module.exports = {
  requiresInstance: true,
  execute: async () => {
    const resourcesPath = fs.path.resolve(`${environment.pathToProject}/resources.json`);

    if(!fs.exists(resourcesPath)) {
      warn(`No resources file found at path: ${resourcesPath}`);
      return Promise.resolve();
    }

    const doc = {
      _id: 'resources',
      resources: fs.readJson(resourcesPath),
      _attachments: attachmentsFromDir(`${environment.pathToProject}/resources`),
    };

    const db = pouch();

    await warnUploadOverwrite.preUploadByRev(environment.pathToProject, db, doc);

    await insertOrReplace(db, doc);

    await warnUploadOverwrite.postUploadByRev(environment.pathToProject, db, doc);

    return Promise.resolve();
  }
};
