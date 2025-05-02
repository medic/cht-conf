const userPrompt = require('./user-prompt');
const url = require('url');

const emoji = require('./emoji');
const { info } = require('./log');
const usage = require('../cli/usage');

const getApiUrl = (cmdArgs, env = {}) => {
  const specifiedModes = [cmdArgs.local, cmdArgs.instance, cmdArgs.url, cmdArgs.archive].filter(mode => mode);
  if (specifiedModes.length !== 1) {
    usage();
    throw Error('One of these parameters is required: --local --instance --url --archive');
  }

  if (cmdArgs.user && !cmdArgs.instance) {
    usage();
    throw Error('The --user switch must be accompanied with --instance');
  }

  let instanceUrl;
  if (cmdArgs.local || cmdArgs.archive) {
    // Although `--archive` mode won't connect with the
    // local database, a URL is required to mimic the
    // behaviour as it is connecting to.
    // See ./archiving-db.js
    instanceUrl = parseLocalUrl(env.COUCH_URL);
    if (instanceUrl.hostname !== 'localhost') {
      throw Error(
        `--local was specified but COUCH_URL env var is set to '${instanceUrl.hostname}'.  `
        + `Please use --url for remote servers.`
      );
    }
  } else if (cmdArgs.instance) {
    const password = userPrompt.question(`${emoji.key}  Password: `, { hideEchoBack: true });
    const instanceUsername = cmdArgs.user || 'admin';
    const encodedPassword = encodeURIComponent(password);
    instanceUrl = new url.URL(`https://${instanceUsername}:${encodedPassword}@${cmdArgs.instance}.medicmobile.org`);
  } else if (cmdArgs.url) {
    instanceUrl = new url.URL(cmdArgs.url);
  }

  instanceUrl.pathname = `${instanceUrl.pathname}medic`;
  return instanceUrl;
};

const isLocalhost = (apiUrl) => {
  if (!apiUrl) {
    return false;
  }
  const localhosts = [/^localhost$/, /^127\.0\.0\.\d+$/];
  return !!localhosts.find(localhost => localhost.test(apiUrl.hostname));
};

const parseLocalUrl = (couchUrl) => {
  const doParse = (unparsed) => {
    const parsed = new url.URL(unparsed);
    parsed.path = parsed.pathname = '';
    parsed.host = `${parsed.hostname}:${parsed.port}`;
    return new url.URL(url.format(parsed));
  };
  
  if (couchUrl) {
    info(`Using local url from COUCH_URL environment variable: ${couchUrl}`);
    return doParse(couchUrl);
  }

  info('Using default local url');
  return new url.URL('http://admin:pass@localhost:5988');
};

module.exports = {
  getApiUrl,
  isLocalhost,
};
