const info = require('../lib/log').info;
const request = require('request-promise-native');

module.exports = (cols, rows, instanceUrl) => {
    const usernameIndex = cols.indexOf('username');
    const passwordIndex = cols.indexOf('password');
    const placeIdIndex = cols.indexOf('place');
    const rolesIndex = cols.indexOf('roles');
    return rows.reduce((promiseChain, row) => {
        const username = row[usernameIndex];
        const password = row[passwordIndex];
        const roles = rolesIndex === -1 ? undefined :row[rolesIndex].split(':') ;
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
  