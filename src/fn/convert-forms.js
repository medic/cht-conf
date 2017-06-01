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
          .then(() => fixXml(targetPath))
          .then(() => trace('Converted form', sourcePath));
      }));
};

const xls2xform = (sourcePath, targetPath) =>
    exec('medic-xls2xform', sourcePath, targetPath)
      .catch(e => {
        error('There was a problem executing xls2xform.  It may not be installed.  To install, run ' + require('../cli/xls2xform-installation-command'));
        throw e;
      });

const fixXml = path =>
      fs.write(path, fs.read(path)
          // FIXME here we fix the form content before uploading it.  Seeing as we
          // have our own fork of pyxform, we should actually be doing this fixing
          // there.  TODO move this fix to pyxform once form conversion is
          // integrated with this tool.
          // TODO This is not how you should modify XML
          .replace(/ default="true\(\)"/g, ''));
