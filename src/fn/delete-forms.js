const environment = require('../lib/environment');
const { info, warn } = require('../lib/log');
const pouch = require('../lib/db');

const deleteForms = (forms) => {
  if (!forms || !forms.length) {
    warn('No forms specified for deleting.');
    return;
  }
  const db = pouch();
  return Promise.all(forms.map(formName => {
    const docId = `form:${formName}`;
    return db.get(docId)
      .then(doc => db.remove(doc))
      .then(() => info('Deleted form:', formName))
      .catch(e => warn(`Failed to remove form with doc ID ${docId}`, e));
  }));
};

module.exports = {
  requiresInstance: true,
  execute: () => deleteForms(environment.extraArgs),
  deleteForms,
};
