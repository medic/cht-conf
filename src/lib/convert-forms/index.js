const argsFormFilter = require('../args-form-filter');
const exec = require('../exec-promise');
const fs = require('../sync-fs');
const nodeFs = require('node:fs');
const {
  getFormDir,
  escapeWhitespacesInPath,
} = require('../forms-utils');
const { info, trace, warn, LEVEL_NONE } = require('../log');
const path = require('node:path');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const xmlFormat = require('xml-formatter');
const { replaceBase64ImageDynamicDefaults, replaceItemSetsWithMedia } = require('./handle-media');
const { removeNoLabelNodes } = require('./handle-no-label-placeholders');
const { removeExtraRepeatInstance, addRepeatCount } = require('./handle-repeat');
const { handleDbDocRefs } = require('./handle-db-doc-ref');
const { handleFormId } = require('./handle-form-id');

const domParser = new DOMParser();
const serializer = new XMLSerializer();
const XLS2XFORM = path.join(__dirname, '..', '..', '..', 'bin', 'xls2xform-medic');

const FORM_EXTENSION = '.xlsx';
const formFileMatcher = (fileName) => {
  if (fileName.endsWith(FORM_EXTENSION) &&
    !fileName.startsWith('~$') // ignore Excel "owner files"
    && fileName !== 'PLACE_TYPE-create.xlsx' && fileName !== 'PLACE_TYPE-edit.xlsx') {
    return fileName.slice(0, fileName.length - FORM_EXTENSION.length);
  }
  return null;
};

const execute = async (projectDir, subDirectory, options = {}) => {
  const formsDir = getFormDir(projectDir, subDirectory);

  if (!fs.exists(formsDir)) {
    warn(`Forms dir not found: ${formsDir}`);
    return;
  }

  const filesToConvert = argsFormFilter(formsDir, FORM_EXTENSION, options)
    .filter(name => formFileMatcher(name));

  for (const xls of filesToConvert) {
    const sourcePath = `${formsDir}/${xls}`;
    const targetPath = `${fs.withoutExtension(sourcePath)}.xml`;

    info('Converting form', sourcePath, '…');

    try {
      await xls2xform(escapeWhitespacesInPath(sourcePath), escapeWhitespacesInPath(targetPath), xls);
      const hiddenFields = await getHiddenFields(`${fs.withoutExtension(sourcePath)}.properties.json`);
      fixXml(targetPath, hiddenFields, options.transformer, options.enketo);
    } catch (e) {
      // Remove xml file to avoid possibly leaving it in an invalid state
      nodeFs.rmSync(targetPath, { force: true });
      throw e;
    }

    trace('Converted form', sourcePath);
  }
};

module.exports = {
  SUPPORTED_EXTENSIONS: [FORM_EXTENSION],
  formFileMatcher,
  execute
};

const PYXFORM_EMPTY_GROUP_ERROR = '\'NoneType\' object is not iterable';
const PYXFORM_CODES = {
  OK: 100,
  WARNING: 101,
  // ERROR: 999
};

const pyxformErrorMessage = (e) => {
  const errorMsg = typeof e === `string` ? e : e.message || JSON.stringify(e);
  if (PYXFORM_EMPTY_GROUP_ERROR === errorMsg) {
    // Pyxform does not gracefully handle empty groups https://github.com/XLSForm/pyxform/issues/754
    return `Check the form for an empty group or repeat.`;
  }
  return errorMsg;
};

const xls2xform = async (sourcePath, targetPath, xlsxFileName) => {
  const result = await exec([XLS2XFORM, '--skip_validate', '--json', sourcePath, targetPath], LEVEL_NONE)
    .then((output) => {
      const entries = output
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      // It is possible for pyxform dependencies to log to stdout, so we take the last line
      entries
        .slice(0, -1)
        .forEach(line => warn(line));
      return JSON.parse(entries.at(-1));
    })
    .catch(e => {
      throw new Error(`There was a problem executing xls2xform. Make sure you have Python 3.10+ installed.\n${
        pyxformErrorMessage(e)
      }`);
    });
  const {
    code,
    warnings = [],
  } = result;

  switch (code) {
  case PYXFORM_CODES.OK:
    break;
  case PYXFORM_CODES.WARNING:
    warn(`Converted ${xlsxFileName} with warnings:`);
    warnings.forEach(w => warn(w));
    break;
  default:
    throw new Error(`Could not convert ${xlsxFileName}: ${pyxformErrorMessage(result)}`);
  }
};

// here we fix the form content in arcane ways.  Seeing as we have out own fork
// of pyxform, we should probably be doing this fixing there.
const fixXml = (path, hiddenFields, transformer, enketo) => {
  // This is not how you should modify XML, but we have reasonable control over
  // the input and so far this works OK.  Keep an eye on the tests, and any
  // future changes to the output of xls2xform.
  let xml = fs.read(path)

    // The following copies behaviour from old bash scripts, and will create a
    // second <meta> element if one already existed.  We may want to actually
    // merge the two instead.
    .replace(/<inputs>/, META_XML_SECTION);

  // Enketo _may_ not work with forms which define a default language - see
  // https://github.com/medic/cht-core/issues/3174
  if (enketo) {
    xml = xml.replaceAll('default="true()"', '');
  }

  if (hiddenFields) {
    const r = new RegExp(`<(${hiddenFields.join('|')})(/?)>`, 'g');
    xml = xml.replace(r, '<$1 tag="hidden"$2>');
  }

  // Check for deprecations
  if (xml.includes('repeat-relevant')) {
    warn('From webapp version 2.14.0, repeat-relevant is no longer required.  See https://github.com/medic/cht-core/issues/3449 for more info.');
  }
  const xmlDoc = domParser.parseFromString(xml);

  handleFormId(xmlDoc, path);// TODO do not write on error
  replaceItemSetsWithMedia(xmlDoc);
  replaceBase64ImageDynamicDefaults(xmlDoc);
  removeNoLabelNodes(xmlDoc);
  removeExtraRepeatInstance(xmlDoc);
  addRepeatCount(xmlDoc);
  handleDbDocRefs(xmlDoc);

  const xmlString = serializer.serializeToString(xmlDoc);
  xml = xmlFormat(xmlString, {
    collapseContent: true,
    forceSelfClosingEmptyTag: true,
    indentation: '  ',
    ignoredPaths: [
      'value' // Avoid trimming whitespace in the label text.
    ],
    lineSeparator: '\n'
  }).replaceAll(/\s+<\/value>/g, '</value>'); // Ignoring the 'value' path results in extra trailing whitespace

  if (transformer) {
    xml = transformer(xml, path);
  }

  fs.write(path, xml);
};

function getHiddenFields(propsJson) {
  if (fs.exists(propsJson)) {
    return fs.readJson(propsJson).hidden_fields;
  }

  return [];
}

const META_XML_SECTION = `<inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>`;
