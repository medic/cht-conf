const fs = require('../lib/sync-fs');
const PouchDB = require('pouchdb');

const attachmentsFromDir = require('../lib/attachments-from-dir');
const insertOrUpdate = require('../lib/insert-or-update');

module.exports = (project, couchUrl) => {
  const db = new PouchDB(couchUrl);

  return insertOrUpdate(db, {
    _id: 'resources',
    resources: fs.readJson(`${project}/resources.json`),
    _attachments: attachmentsFromDir(`${project}/resources`),
  });
};
