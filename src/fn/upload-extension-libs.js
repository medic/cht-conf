const environment = require('../lib/environment');
const pouch = require('../lib/db');
const log = require('../lib/log');
const attachmentsFromDir = require('../lib/attachments-from-dir');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');
const insertOrReplace = require('../lib/insert-or-replace');
const projectPaths = require('../lib/project-paths');

const DOC_ID = 'extension-libs';

module.exports = {
  requiresInstance: true,
  execute: async () => {
    const configurationDir = `${environment.pathToProject}/${projectPaths.EXTENSION_LIBS_PATH}`;

    const attachments = attachmentsFromDir(configurationDir);
    if (!Object.keys(attachments).length) {
      log.info(`No configuration found at "${configurationDir}" - not uploading extension-libs`);
      return;
    }
    
    const doc = {
      _id: DOC_ID,
      _attachments: attachments
    };
    
    const db = pouch(environment.apiUrl);
    const changes = await warnUploadOverwrite.preUploadDoc(db, doc);
  
    if (!changes) {
      log.info('Extension libs not uploaded as already up to date');
      return;
    }

    await insertOrReplace(db, doc);
    log.info('Extension libs upload complete');

    return await warnUploadOverwrite.postUploadDoc(db, doc);
  }
};
