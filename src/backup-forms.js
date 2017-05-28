const fs = require('./sync-fs');
const PouchDB = require('pouchdb');

const backupFileFor = require('./backup-file-for');

module.exports = (project, couchUrl) => {
  const db = new PouchDB(couchUrl);

  function backup(form) {
    const backupDir = backupFileFor(project, form.id);
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
