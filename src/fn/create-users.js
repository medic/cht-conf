const fs = require('../lib/sync-fs');
const createUsers = require('../lib/create-user');

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) throw new Error('Server URL must be defined to use this function.');
  const instanceUrl = couchUrl.replace(/\/medic$/, '');

  return Promise.resolve()
    .then(() => {
      const csvPath = `${projectDir}/users.csv`;

      if(!fs.exists(csvPath)) throw new Error(`User csv file not found at ${csvPath}`);

      const { cols, rows } = fs.readCsv(csvPath);
      return createUsers(cols, rows, instanceUrl);
    });
};