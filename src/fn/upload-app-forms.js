const uploadForms = require('../lib/upload-forms');

module.exports = (project, couchUrl) => uploadForms(project, couchUrl, 'app');
