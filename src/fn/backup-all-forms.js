const log = require('../lib/log');
const fs = require('../lib/sync-fs');
const skipFn = require('../lib/skip-fn');
const pouch = require('../lib/db');
const formsList = require('../lib/forms-list');
const backupFileFor = require('../lib/backup-file-for');

module.exports = (projectDir, couchUrl) => {
  if (!couchUrl) {
    return skipFn('no couch URL set');
  }

  const db = pouch(couchUrl);
  const parentBackupDir = backupFileFor(projectDir, 'forms');

  log('Backing up forms to:', parentBackupDir);
  fs.mkdir(parentBackupDir);

  function backup(form) {
    const backupDir = `${parentBackupDir}/${form.id.replace(/:/g, '_')}`;
    fs.mkdir(backupDir);
    return db.get(form.id, { attachments:true, binary:true })
      .then(form => {
        fs.writeJson(`${backupDir}/context.json`, form.context);
        Object.keys(form._attachments).forEach(name => {
          const att = form._attachments[name];
          const destination = fs.path.join(backupDir, name);
          if (fs.path.dirname(destination) !== backupDir) {
            fs.mkdir(fs.path.dirname(destination));
          }
          fs.writeBinary(destination, att.data);
        });
      });
  }

  return formsList(db)
    .then(res => res.rows)
    .then(forms => Promise.all(forms.map(backup)));
};
