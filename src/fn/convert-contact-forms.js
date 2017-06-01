const convertForms = require('../lib/convert-forms');

module.exports = (project/*, couchUrl*/) => convertForms(project, 'contact', { force_data_node:'data' });
