const skipFn = require('../lib/skip-fn');
const pouch = require('../lib/db');
const formsList = require('../lib/forms-list');

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  const db = pouch(couchUrl);

  return formsList(db, { include_docs: true })
    .then(res => res.rows)
    .then(forms => Promise.all(forms.map(f => db.remove(f.doc))));
};
