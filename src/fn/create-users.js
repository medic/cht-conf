const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const request = require('request-promise-native');

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) throw new Error('Server URL must be defined to use this function.');
  const instanceUrl = couchUrl.replace(/\/medic$/, '');

  return Promise.resolve()
    .then(() => {
      const csvPath = `${projectDir}/users.csv`;

      if(!fs.exists(csvPath)) throw new Error(`User csv file not found at ${csvPath}`);

      const { cols, rows } = fs.readCsv(csvPath);
      const usernameIndex = cols.indexOf('username');
      const passwordIndex = cols.indexOf('password');
      const rolesIndex = cols.indexOf('roles');
      const placeIdIndex = cols.indexOf('place');

      return rows.reduce((promiseChain, row) => {
        const username = row[usernameIndex];
        const password = row[passwordIndex];
        const roles     = row[rolesIndex].split(':');
        const contact = prefixedProperties(cols, row, 'contact.');
        const place = placeIdIndex === -1 ? prefixedProperties(cols, row, 'place.') : row[placeIdIndex];
        const requestObject = { username, password, roles, place, contact };

        return promiseChain
          .then(() => {
            info('Creating user', username);
            return request({
              uri: `${instanceUrl}/api/v1/users`,
              method: 'POST',
              json: true,
              body: requestObject,
            });
          });
      }, Promise.resolve());
    });
};

function prefixedProperties (cols, row, prefix) {
  const indices = {};
  cols.forEach(col => {
    if (col.startsWith(prefix)) {
      indices[col.substring(prefix.length)] = row[cols.indexOf(col)];
    }
  });
  return indices;
}
