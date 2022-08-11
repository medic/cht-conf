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

  return semver.valid(version) ? version : null;
};

const getValidApiVersion = async () => {
  return semver.valid(await getApiVersion());
};

module.exports = { getValidApiVersion };
