const argsFormFilter = require('../args-form-filter');
const exec = require('../exec-promise');
const fs = require('../sync-fs');
const {
  getFormDir,
  escapeWhitespacesInPath,
} = require('../forms-utils');
const { info, trace, warn } = require('../log');
const path = require('node:path');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const xmlFormat = require('xml-formatter');
const { replaceBase64ImageDynamicDefaults, replaceItemSetsWithMedia } = require('./handle-media');
const { removeNoLabelNodes } = require('./handle-no-label-placeholders');
const { removeExtraRepeatInstance, addRepeatCount } = require('./handle-repeat');
const { handleDbDocRefs } = require('./handle-db-doc-ref');

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

const execute = async (projectDir, subDirectory, options) => {
  if (!options) {
    options = {};
  }

  const formsDir = getFormDir(projectDir, subDirectory);

  if (!fs.exists(formsDir)) {
    warn(`Forms dir not found: ${formsDir}`);
    return;
  }

  const filesToConvert = argsFormFilter(formsDir, FORM_EXTENSION, options)
    .filter(name => formFileMatcher(name));

  for (const xls of filesToConvert) {
    const originalSourcePath = `${formsDir}/${xls}`;
    let sourcePath;

    if (options.force_data_node) {
      const temporaryPath = `${fs.mkdtemp()}/${options.force_data_node}.xlsx`;
      fs.copy(originalSourcePath, temporaryPath);
      sourcePath = temporaryPath;
    } else {
      sourcePath = originalSourcePath;
    }

    const targetPath = `${fs.withoutExtension(originalSourcePath)}.xml`;

    info('Converting form', originalSourcePath, '…');

    await xls2xform(escapeWhitespacesInPath(sourcePath), escapeWhitespacesInPath(targetPath));
    const hiddenFields = await getHiddenFields(`${fs.withoutExtension(originalSourcePath)}.properties.json`);
    fixXml(targetPath, hiddenFields, options.transformer, options.enketo);
    trace('Converted form', originalSourcePath);
  }
};

module.exports = {
  SUPPORTED_EXTENSIONS: [FORM_EXTENSION],
  formFileMatcher,
  execute
};

const xls2xform = (sourcePath, targetPath) =>
  exec([XLS2XFORM, '--skip_validate', sourcePath, targetPath])
    .catch(() => {
      throw new Error('There was a problem executing xls2xform.  Make sure you have Python 3.10+ installed.');
    });

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
    .replace(/<inputs>/, META_XML_SECTION)

    // No comment.
    .replace(/.*DELETE_THIS_LINE.*(\r|\n)/g, '')
    ;

  // Enketo _may_ not work with forms which define a default language - see
  // https://github.com/medic/cht-core/issues/3174
  if (enketo) {
    xml = xml.replace(/ default="true\(\)"/g, '');
  }

  if (hiddenFields) {
    const r = new RegExp(`<(${hiddenFields.join('|')})(/?)>`, 'g');
    xml = xml.replace(r, '<$1 tag="hidden"$2>');
  }

  // Check for deprecations
  if (xml.includes('repeat-relevant')) {
    warn('From webapp version 2.14.0, repeat-relevant is no longer required.  See https://github.com/medic/cht-core/issues/3449 for more info.');
  }

  const domParser = new DOMParser();
  const xmlDoc = domParser.parseFromString(xml);
  const serializer = new XMLSerializer();

  // TODO Make sure we log cht-core issues to address these properly
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
  if (!fs.exists(propsJson)) {
    return [];
  }
  else {
    return fs.readJson(propsJson).hidden_fields;
  }
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
