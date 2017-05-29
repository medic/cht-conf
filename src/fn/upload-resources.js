const fs = require('../lib/sync-fs');
const attachmentsFromDir = require('../lib/attachments-from-dir');

const PouchDB = require('pouchdb');

module.exports = (project, couchUrl) => {
  const db = new PouchDB(couchUrl);

  return db.get('resources')
    .catch(e => {
      if(e.status === 404) return { _id:'resources' };
      else throw e;
    })
    .then(doc => {
      doc.resources = fs.readJson(`${project}/resources.json`);
      doc._attachments = attachmentsFromDir(`${project}/resources`);
      return db.put(doc);
    });
};
