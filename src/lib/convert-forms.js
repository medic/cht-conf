const error = require('../lib/log').error;
const exec = require('../lib/exec-promise');
const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const trace = require('../lib/log').trace;

module.exports = (project, subDirectory, options) => {
  if(!options) options = {};

  const formsDir = `${project}/forms/${subDirectory}`;

  return fs.readdir(formsDir)
    .filter(name => name.endsWith('.xlsx'))
    .reduce((promiseChain, xls) => {
        const originalSourcePath = `${formsDir}/${xls}`;
        let sourcePath;

        if(options.force_data_node) {
          const temporaryPath = `${fs.mkdtemp()}/${options.force_data_node}.xlsx`;
          fs.copy(originalSourcePath, temporaryPath);
          sourcePath = temporaryPath;
        } else sourcePath = originalSourcePath;

        const targetPath = `${fs.withoutExtension(originalSourcePath)}.xml`;

        return promiseChain
          .then(() => info('Converting form', originalSourcePath, '…'))
          .then(() => xls2xform(sourcePath, targetPath))
          .then(() => fixXml(targetPath))
          .then(() => trace('Converted form', originalSourcePath));
      },
      Promise.resolve());
};

const xls2xform = (sourcePath, targetPath) =>
    exec('medic-xls2xform', sourcePath, targetPath)
      .catch(e => {
        error('There was a problem executing xls2xform.  It may not be installed.  To install, run ' + require('../cli/xls2xform-installation-command'));
        throw e;
      });

// FIXME here we fix the form content before uploading it.  Seeing as we
// have our own fork of pyxform, we should probably be doing this fixing
// there.
const fixXml = path =>
      fs.write(path, fs.read(path)
          // TODO This is not how you should modify XML
          .replace(/ default="true\(\)"/g, '')

          // TODO The following copies behaviour from old bash scripts, and will
          // create a second <meta> element if one already existed.  We may want
          // to actually merge the two instead.
          .replace(/<inputs>/, META_XML_SECTION)

          .replace(/.*DELETE_THIS_LINE.*\n/g, '')
          );

const META_XML_SECTION = `<inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>`;
