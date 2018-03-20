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

      return rows.reduce((promiseChain, row) => {
        const username = row[cols.indexOf('username')];
        const password = row[cols.indexOf('password')];
        const type     = row[cols.indexOf('type')];

        const contact = prefixedProperties(cols, row, 'contact.');
        const place =   prefixedProperties(cols, row, 'place.'  );

        const requestObject = { username, password, type, place, contact };

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

function prefixedProperties(cols, row, prefix) {
  return cols
    .filter(col => col.startsWith(prefix))
    .reduce((obj, col) => {
      obj[col.substring(prefix.length)] = row[cols.indexOf(col)];
      return obj;
    }, {});
}
