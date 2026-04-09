const semver = require('semver');

const api = require('./api');
const db = require('./db');

const getApiVersion = async () => {
  let version;

  try {
    version = await api().version();
  }
  catch (err) {
    const ddoc = await db().get('_design/medic-client');
    version = ddoc.deploy_info && ddoc.deploy_info.version;
  }

  return version;
};

let cachedVersion;
const getValidApiVersion = async () => {
  if (!cachedVersion) {
    cachedVersion = semver.valid(semver.coerce(await getApiVersion()));
  }
  return cachedVersion;
};

const clearCache = () => {
  cachedVersion = undefined;
};

module.exports = { getValidApiVersion, clearCache };
