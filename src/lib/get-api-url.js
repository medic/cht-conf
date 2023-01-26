const userPrompt = require('./user-prompt');
const url = require('url');

const emoji = require('./emoji');
const { info } = require('./log');
const usage = require('../cli/usage');

const getApiUrl = (cmdArgs, env = {}) => {
  const specifiedModes = [cmdArgs.local, cmdArgs.instance, cmdArgs.url, cmdArgs.archive].filter(mode => mode);
  if (specifiedModes.length !== 1) {
    usage();
    throw Error('One of these parameter is required: --local --instance --url --archive');
  }

  if (cmdArgs.user && !cmdArgs.instance) {
    usage();
    throw Error('The --user switch can only be used if accompanied with --instance');
  }

  let instanceUrl;
  if (cmdArgs.local || cmdArgs.archive) {
    // Although `--archive` mode won't connect with the
    // local database, a URL is required to mimic the
    // behaviour as it is connecting to.
    // See ./archiving-db.js
    instanceUrl = parseLocalUrl(env.COUCH_URL);
    if (instanceUrl.hostname !== 'localhost') {
      throw Error(`You used --local but COUCH_URL env var is set to '${instanceUrl.hostname}'.  This may be a remote server.`);
    }
  } else if (cmdArgs.instance) {
    const password = userPrompt.question(`${emoji.key}  Password: `, { hideEchoBack: true });
    const instanceUsername = cmdArgs.user || 'admin';
    const encodedPassword = encodeURIComponent(password);
    instanceUrl = new url.URL(`https://${instanceUsername}:${encodedPassword}@${cmdArgs.instance}.medicmobile.org`);
  } else if (cmdArgs.url) {
    instanceUrl = new url.URL(cmdArgs.url);
  }

  return `${instanceUrl.href}medic`;
};

const parseLocalUrl = (couchUrl) => {
  const doParse = (unparsed) => {
    const parsed = new url.URL(unparsed);
    parsed.path = parsed.pathname = '';
    parsed.host = `${parsed.hostname}:5988`;
    return new url.URL(url.format(parsed));
  };

  if (couchUrl) {
    info(`Using local url from COUCH_URL environment variable: ${couchUrl}`);
    return doParse(couchUrl);
  }

  info('Using default local url');
  return new url.URL('http://admin:pass@localhost:5988');
};

module.exports = getApiUrl;
