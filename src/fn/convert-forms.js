const error = require('../lib/log').error;
const exec = require('../lib/exec-promise');
const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const trace = require('../lib/log').trace;

module.exports = (project/*, couchUrl*/) => {
  const formsDir = `${project}/forms`;

  return Promise.all(
    fs.readdir(formsDir)
      .filter(name => name.endsWith('.xlsx'))
      .map(xls => {
        const sourcePath = `${formsDir}/${xls}`;
        const targetDir = `${formsDir}/${fs.withoutExtension(xls)}`;
        const targetPath = `${targetDir}/xml`;

        fs.mkdir(targetDir);

        return Promise.resolve()
          .then(() => info('Converting form', sourcePath, '…'))
          .then(() => xls2xform(sourcePath, targetPath))
          .then(() => trace('Converted form', sourcePath));
      }));
};

const xls2xform = (sourcePath, targetPath) =>
    exec('medic-xls2xform', sourcePath, targetPath)
      .catch(e => {
        error('There was a problem executing xls2xform.  It may not be installed.  To install, run ' + require('../cli/xls2xform-installation-command'));
        throw e;
      });
