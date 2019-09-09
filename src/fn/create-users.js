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

const parseUsersData = (csvData) => {
  const users = csvParse(csvData, { columns: true });
  users.forEach(user => {
    user.contact = nestPrefixedProperties(user, 'contact');
    user.place = nestPrefixedProperties(user, 'place');
    user.roles = user.roles && user.roles.split(':');
  });
  return users;
};

const getUserInfo = async (instanceUrl, user) => {
  const getId = (obj) => typeof obj === 'string' ? obj : obj._id;
  const facilityId = getId(user.place);
  if (!facilityId) {
    // new place - nothing to check
    return;
  }

  const params = {
    facility_id: facilityId,
    role: JSON.stringify(user.roles),
    contact: getId(user.contact),
  };

  info(`Requesting user-info for "${user.username}"`);
  let result;
  try {
    result = await request.get(`${instanceUrl}/api/v1/users-info`, { qs: params, json: true });
  } catch (err) {
    // we can safely ignore some errors
    // - 404: This endpoint was only added in 3.7
    // - 400: The endpoint throws an error if the requested roles are "online"
    // - 400: Missing facility or role, the corresponding user create request will fail
    if (err.statusCode !== 404 && err.statusCode !== 400) {
      throw err;
    }
  }
  return result;
};

const createUser = (instanceUrl, user) => {
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

  const users = parseUsersData(fs.read(csvPath));
  const warnings = [];
  for (let user of users) {
    const userInfo = await getUserInfo(instanceUrl, user);
    if (userInfo && userInfo.warn) {
      warnings.push(`The user "${user.username}" would replicate ${userInfo.total_docs}, which is above the recommended limit of ${userInfo.limit}.`);
    }
  }
  if (warnings.length) {
    warnings.forEach(warning => warn(warning));
    warn('Are you sure you want to continue?');
    if(!readline.keyInYN()) {
      error('User failed to confirm action.');
      process.exit(1);
      return; // stop execution in tests
    }
  }

  for (let user of users) {
    info(`Creating user ${user.username}`);
    await createUser(instanceUrl, user);
  }
};
