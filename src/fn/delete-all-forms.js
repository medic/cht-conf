const pouch = require('../lib/db');
const formsList = require('../lib/forms-list');

module.exports = (projectDir, apiUrl) => {
  const db = pouch(apiUrl);
  return formsList(db, { include_docs: true })
    .then(res => res.rows)
    .then(forms => Promise.all(forms.map(f => db.remove(f.doc))));
};
