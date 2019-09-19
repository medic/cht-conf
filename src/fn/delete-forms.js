const { info, warn } = require('../lib/log');

module.exports = (projectDir, db, api, extras) => {
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
