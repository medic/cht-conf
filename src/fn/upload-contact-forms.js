const uploadForms = require('../lib/upload-forms');

module.exports = (project, couchUrl) => uploadForms(project, couchUrl, 'contact', {
  id_prefix: 'contact:',
});
