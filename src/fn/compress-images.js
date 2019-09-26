const compressPng = require('../lib/compress-png');
const compressSvg = require('../lib/compress-svg');
const fs = require('../lib/sync-fs');

module.exports = (projectDir/*, couchUrl*/) =>
  fs.recurseFiles(projectDir)
    .reduce((promiseChain, path) => {
        switch(fs.extension(path)) {
          case 'png': return compressPng(promiseChain, path);
          case 'svg': return compressSvg(promiseChain, path);
        }
        return promiseChain;
      },
      Promise.resolve());
