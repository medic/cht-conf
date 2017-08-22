const execSync = require('child_process').execSync;
const exec = require('../lib/exec-promise');
const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const trace = require('../lib/log').trace;
const warn = require('../lib/log').warn;

const XLS2XFORM = 'xls2xform-medic';

module.exports = (projectDir, subDirectory, options) => {
  if(!options) options = {};

  const formsDir = `${projectDir}/forms/${subDirectory}`;

  if(!fs.exists(formsDir)) {
    warn(`Forms dir not found: ${formsDir}`);
    return Promise.resolve();
  }

  return fs.readdir(formsDir)
    .filter(name => name.endsWith('.xlsx'))
    .filter(name => !name.startsWith('~$')) // ignore Excel "owner files"
    .filter(name => !options.forms || options.forms.includes(fs.withoutExtension(name)))
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
          .then(() => getHiddenFields(`${fs.withoutExtension(originalSourcePath)}.properties.json`))
          .then(hiddenFields => fixXml(targetPath, hiddenFields))
          .then(() => trace('Converted form', originalSourcePath));
      },
      Promise.resolve());
};

const xls2xform = (sourcePath, targetPath) =>
    exec(XLS2XFORM, sourcePath, targetPath)
      .catch(e => {
        if(executableAvailable()) throw e;
        else throw new Error('There was a problem executing xls2xform.  It may not be installed.  To install, run ' + require('../cli/xls2xform-installation-command'));
      });

// FIXME here we fix the form content in arcane ways.  Seeing as we have out own
// fork of pyxform, we should probably be doing this fixing there.
const fixXml = (path, hiddenFields) => {
  let xml = fs.read(path)
      // TODO This is not how you should modify XML
      .replace(/ default="true\(\)"/g, '')

      // TODO The following copies behaviour from old bash scripts, and will
      // create a second <meta> element if one already existed.  We may want
      // to actually merge the two instead.
      .replace(/<inputs>/, META_XML_SECTION)

      // XLSForm does not allow saving a field without a label, so we use the
      // placeholder NO_LABEL.
      .replace(/NO_LABEL/g, '')

      // No comment.
      .replace(/.*DELETE_THIS_LINE.*(\r|\n)/g, '')
      ;

  if(hiddenFields) {
    const r = new RegExp(`<(${hiddenFields.join('|')})(/?)>`, 'g');
    xml = xml.replace(r, '<$1 tag="hidden"$2>');
  }

  // The ordering of elements in the <model> has an arcane affect on the
  // order that docs are saved in the database when processing a form.
  // Move the main doc's element down to the bottom.
  xml = shiftThingsAroundInTheModel(path, xml);

  fs.write(path, xml);
};

function getHiddenFields(propsJson) {
  if(!fs.exists(propsJson)) return [];
  else return fs.readJson(propsJson).hidden_fields;
}

function executableAvailable() {
  try {
    execSync(`${XLS2XFORM} -h`, {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch(e) {
    return false;
  }
}

const shiftThingsAroundInTheModel = (path, xml) => {
  const baseName = fs.path.parse(path).name.replace(/-(create|edit)$/, '');
  let matchedBlock;

  if(xml.includes('</inputs>')) {
    const matcher = new RegExp(`\\s*<${baseName}>[\\s\\S]*</${baseName}>\\s*(\\r|\\n)`);

    xml = xml.replace(matcher, match => {
      matchedBlock = match;
      return '\n';
    });

    if(matchedBlock) {
      xml = xml.replace(/<\/inputs>(\r|\n)/, '</inputs>' + matchedBlock);
    }
  }

  return xml;
};

const META_XML_SECTION = `<inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>`;
