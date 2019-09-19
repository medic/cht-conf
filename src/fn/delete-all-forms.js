const formsList = require('../lib/forms-list');

module.exports = (projectDir, db) => {
  return formsList(db, { include_docs: true })
    .then(res => res.rows)
    .then(forms => Promise.all(forms.map(f => db.remove(f.doc))));
};
