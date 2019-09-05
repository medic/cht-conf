const fs = require('../lib/sync-fs');
const csvParse = require('csv-parse/lib/sync');
const { info, warn, error } = require('../lib/log');
const request = require('request-promise-native');
const readline = require('readline-sync');

const nestPrefixedProperties = (obj, name) => {
  const nested = {};
  const prefix = `${name}.`;
  Object
    .keys(obj)
    .filter(key => key.startsWith(prefix))
    .forEach(key => {
      nested[key.substring(prefix.length)] = obj[key];
      delete obj[key];
    });
  return obj[name] || nested;
};

const getUsersData = (csvData) => {
  const users = csvParse(csvData, { columns: true });
  users.forEach(user => {
    user.contact = nestPrefixedProperties(user, 'contact');
    user.place = nestPrefixedProperties(user, 'place');
    user.roles = user.roles && user.roles.split(':');
  });
  return users;
};

const getUserInfo = async (instanceUrl, user) => {
  if (typeof user.place !== 'string') {
    // new place - nothing to check
    return;
  }

  const params = {
    facility_id: user.place,
    role: JSON.stringify(user.roles),
  };
  if (typeof user.contact === 'string') {
    params.contact = user.contact;
  }

  info(`Requesting user-info for "${user.username}"`);
  let result;
  try {
    result = await request.get(`${instanceUrl}/api/v1/users-info`, { qs: params, json: true });
  } catch (err) {
    // we can safely ignore errors
    // a) This endpoint was only added in 3.7, we can ignore the 404
    // b) The endpoint throws an error if the requested roles are "online"
    // c) The requesting authenticated user doesn't have permissions to update users, the corresponding user create request will fail
    // d) Missing facility or role, the corresponding user create request will fail
    if (err.statusCode !== 404 && err.statusCode !== 400) {
      throw err;
    }
  }
  return result;
};

const createUser = async (instanceUrl, user) => {
  return request.post(`${instanceUrl}/api/v1/users`, { json: true, body: user });
};

module.exports = async (projectDir, couchUrl) => {
  if(!couchUrl) {
    throw new Error('Server URL must be defined to use this function.');
  }

  const instanceUrl = couchUrl.replace(/\/medic$/, '');
  const csvPath = `${projectDir}/users.csv`;
  if(!fs.exists(csvPath)) {
    throw new Error(`User csv file not found at ${csvPath}`);
  }

  const users = getUsersData(fs.read(csvPath));
  for (let user of users) {
    const userInfo = await getUserInfo(instanceUrl, user);
    if (userInfo && userInfo.warn) {
      warn(`The user "${user.username}" would replicate ${userInfo.total_docs}, which is above the recommended limit of ${userInfo.limit}. Are you sure you want to continue?`);
      if(!readline.keyInYN()) {
        error('User failed to confirm action.');
        process.exit(1);
        return; // stop execution in tests
      }
    }
  }

  for (let user of users) {
    info(`Creating user ${user.username}`);
    await createUser(instanceUrl, user);
  }
};
