const fetchFiles = require('../lib/fetch-files-from-google');

module.exports = projectDir => {
  fetchFiles(projectDir, 'csvs-on-google-drive.json', 'csv');
};