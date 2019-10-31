const compressPng = require('../lib/compress-png');
const compressSvg = require('../lib/compress-svg');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');

module.exports = () =>
  fs.recurseFiles(environment.pathToProject)
    .reduce((promiseChain, path) => {
        switch(fs.extension(path)) {
          case 'png': return compressPng(promiseChain, path);
          case 'svg': return compressSvg(promiseChain, path);
        }
        return promiseChain;
      },
      Promise.resolve());
