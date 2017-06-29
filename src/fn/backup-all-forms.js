const log = require('../lib/log');
const fs = require('../lib/sync-fs');
const PouchDB = require('pouchdb');

const backupFileFor = require('../lib/backup-file-for');

module.exports = (project, couchUrl) => {
  const db = new PouchDB(couchUrl);
  const parentBackupDir = backupFileFor(project, 'forms');

  log('Backing up forms to:', parentBackupDir);
  fs.mkdir(parentBackupDir);

  function backup(form) {
    const backupDir = `${parentBackupDir}/${form.id.replace(/:/g, '_')}`;

    fs.mkdir(backupDir);
    db.get(form.id, { attachments:true, binary:true })
      .then(form => {
        fs.writeJson(`${backupDir}/context.json`, form.context);

        const attachmentSaves = [];
        Object.keys(form._attachments).forEach(name => {
          const att = form._attachments[name];
          fs.writeBinary(`${backupDir}/${name}`, att.data);
        });
        return Promise.all(attachmentSaves);
      });
  }

  return db.query('medic-client/forms')
    .then(res => res.rows)
    .then(forms => Promise.all(forms.map(backup)));
};
