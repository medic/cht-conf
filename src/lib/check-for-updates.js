const request = require('request-promise-native');
const { warn, info } = require('../lib/log');
const current = require('../../package.json').version;

module.exports = (options = {}) => {
  return request
    .get('https://registry.npmjs.org/cht-conf')
    .then(res => {
      const json = JSON.parse(res);
      return json['dist-tags'].latest;
    })
    .catch(err => {
      warn(`Could not check NPM for updates: ${err.message}`);
      if (!options.nonFatal) {
        throw err;
      }
    })
    .then(latest => {
      if (latest && latest !== current) {
        warn(`New version available!

      ${current} -> ${latest}

   To install:

     npm install -g cht-conf
    `);
        if (!options.nonFatal) {
          throw new Error('You are not running the latest version of cht-conf!');
        }
      } else if (!options.nonFatal) {
        info('You are already on the latest version :¬)');
      }
    });
};