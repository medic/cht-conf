const { info, warn } = require('../lib/log');
const pouch = require('../lib/db');

module.exports = (projectDir, apiUrl, extras) => {
  const db = pouch(apiUrl);
  if (!extras || !extras.length) {
    warn('No forms specified for deleting.');
    return;
  }

  return Promise.all(extras.map(formName => {
    const docId = `form:${formName}`;
    return db.get(docId)
      .then(doc => db.remove(doc))
      .then(() => info('Deleted form:', formName))
      .catch(e => warn(`Failed to remove form with doc ID ${docId}`, e));
  }));
};
