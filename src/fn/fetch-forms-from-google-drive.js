const fetchFiles = require('../lib/fetch-files-from-google');

module.exports = projectDir => {
  fetchFiles(projectDir,'forms-on-google-drive.json', 'forms');
};