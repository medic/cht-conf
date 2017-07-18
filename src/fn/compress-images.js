const exec = require('../lib/exec-promise');
const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const trace = require('../lib/log').trace;

module.exports = (projectDir/*, couchUrl*/) => {
  return fs.recurseFiles(projectDir)
    .filter(name => name.endsWith('.png'))
    .reduce((promiseChain, png) =>
      promiseChain
        .then(() => info('Compressing PNG:', png, '…'))
        .then(() =>
            exec('pngout-medic', `'${png}'`)
              .then(() => trace('Compressed', png))
              .catch(e => {
                if(e.status === 2) {
                  info('Unable to compress further.');
                } else throw e;
              })),
      Promise.resolve());
};
