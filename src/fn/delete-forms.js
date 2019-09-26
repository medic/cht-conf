const info = require('../lib/log').info;
const pouch = require('../lib/db');
const warn = require('../lib/log').warn;

module.exports = (projectDir, couchUrl, extras) => {
  const db = pouch(couchUrl);

  if(!extras || !extras.length) {
    warn('No forms specified for deleting.');
    return;
  }

  return Promise.all(extras.map(formName => {
    const docId = `form:${formName}`;
    db.get(docId)
      .then(doc => db.remove(doc))
      .then(() => info('Deleted form:', formName))
      .catch(e => warn(`Failed to remove form with doc ID ${docId}`, e));
  }));
};
