const fetchFilesFromGoogleDrive = require('../lib/fetch-files-from-google-drive');

module.exports = projectDir => {
  fetchFilesFromGoogleDrive(
      `${projectDir}/forms-on-google-drive.json`,
      `${projectDir}/forms`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};
