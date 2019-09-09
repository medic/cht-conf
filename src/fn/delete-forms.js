const { info, warn } = require('../lib/log');

module.exports = (projectDir, repository, extras) => {
  if (!extras || !extras.length) {
    warn('No forms specified for deleting.');
    return;
  }

  return Promise.all(extras.map(formName => {
    const docId = `form:${formName}`;
    return repository.get(docId)
      .then(doc => repository.remove(doc))
      .then(() => info('Deleted form:', formName))
      .catch(e => warn(`Failed to remove form with doc ID ${docId}`, e));
  }));
};
