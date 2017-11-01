const skipFn = require('../lib/skip-fn');
const pouchHttp = require('../lib/remote-db');

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  const db = pouchHttp(couchUrl);

  return db.query('medic-client/forms', { include_docs:true })
    .then(res => res.rows)
    .then(forms => Promise.all(forms.map(f => db.remove(f.doc))));
};
