const fetchFilesFromGoogleDrive = require('../lib/fetch-files-from-google-drive');

module.exports = projectDir => {
  fetchFilesFromGoogleDrive(
      `${projectDir}/csvs-on-google-drive.json`,
      `${projectDir}/csv`,
      'text/csv');
};
