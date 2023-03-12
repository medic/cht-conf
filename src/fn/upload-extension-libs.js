const fs = require('fs/promises');
const fsConstants = require('fs').constants;

const environment = require('../lib/environment');
const pouch = require('../lib/db');
const log = require('../lib/log');
const attachmentsFromDir = require('../lib/attachments-from-dir');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');
const insertOrReplace = require('../lib/insert-or-replace');

const DIR_NAME = 'extension-libs';
const DOC_ID = 'extension-libs';

const getConfiguredLibs = async (dir) => {
  try {
    const stats = await fs.stat(dir, fsConstants.R_OK);
    if (!stats.isDirectory()) {
      return []; // file, not directory
    }
    return await fs.readdir(dir);
  } catch(e) {
    return []; // no readable configuration directory
  }
};

module.exports = {
  requiresInstance: true,
  execute: async () => {
    const configurationDir = `${environment.pathToProject}/${DIR_NAME}`;
    const libs = await getConfiguredLibs(configurationDir);
    if (!libs.length) {
      log.info(`No configuration found at "${configurationDir}" - not uploading extension-libs`);
      return;
    }
    
    const doc = { _id: DOC_ID };
    doc._attachments = attachmentsFromDir(configurationDir);
    
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
