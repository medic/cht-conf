const fs = require('../lib/sync-fs');
const PouchDB = require('pouchdb');

const attachmentsFromDir = require('../lib/attachments-from-dir');
const insertOrReplace = require('../lib/insert-or-replace');

module.exports = (project, couchUrl) => {
  const db = new PouchDB(couchUrl);

  return insertOrReplace(db, {
    _id: 'resources',
    resources: fs.readJson(`${project}/resources.json`),
    _attachments: attachmentsFromDir(`${project}/resources`),
  });
};
