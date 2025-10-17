const argsFormFilter = require('../args-form-filter');
const exec = require('../exec-promise');
const fs = require('../sync-fs');
const {
  getFormDir,
  escapeWhitespacesInPath,
  getNodes,
  getInstanceNode,
  getNode,
  XPATH_MODEL,
  XPATH_BODY
} = require('../forms-utils');
const { info, trace, warn } = require('../log');
const path = require('path');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const xmlFormat = require('xml-formatter');

const XLS2XFORM = path.join(__dirname, '..', 'bin', 'xls2xform-medic');

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
    return Promise.resolve();
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
    await fixXml(targetPath, hiddenFields, options.transformer, options.enketo);
    trace('Converted form', originalSourcePath);
  }
};

module.exports = {
  SUPPORTED_EXTENSIONS: [FORM_EXTENSION],
  formFileMatcher,
  execute
};

const xls2xform = (sourcePath, targetPath) =>
  exec([XLS2XFORM, '--skip_validate', '--pretty_print', sourcePath, targetPath])
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

  if (transformer) {
    xml = transformer(xml, path);
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
  removeNoLabels(xmlDoc);
  removeExtraRepeatInstance(xmlDoc);

  const xmlString = serializer.serializeToString(xmlDoc);
  const formattedXmlString = xmlFormat(xmlString, {
    collapseContent: true,
    forceSelfClosingEmptyTag: true,
    indentation: '  ',
    ignoredPaths: [
      'value'
    ]
  }).replaceAll(/\s+<\/value>/g, '</value>'); // Ignoring the 'value' path results in extra trailing whitespace
  fs.write(path, formattedXmlString);

  // fs.write(path, xml);
};

const getDynamicDefaultNode = (xmlDoc) => (ref) => {
  return getNode(
    xmlDoc,
    `${XPATH_MODEL}/setvalue[@ref='${ref}' and string-length(@value) > 0]`
  );
};

const moveDynamicDefaultValueToInstance = (xmlDoc) => (setValueNode) => {
  const ref = setValueNode
    .getAttribute('ref')
    .substring(1);
  const instanceNode = getNode(xmlDoc, `${XPATH_MODEL}/instance[1]/${ref}`);
  if (!instanceNode) {
    return;
  }

  instanceNode.textContent = setValueNode.getAttribute('value');
  removeXmlNode(setValueNode);
};

/**
 * When setting a base64 image string as a default value in a form, pyxform thinks it is "dynamic". This causes the
 * value to not be displayed properly. So, in cases were a default value is being used for a display-base64-image
 * field, this function will move the default value into the instance node where it will be treated as a static value.
 * https://github.com/XLSForm/pyxform/issues/495
 */
const replaceBase64ImageDynamicDefaults = (xmlDoc) => {
  getNodes(xmlDoc, `${XPATH_BODY}//input[contains(@appearance, 'display-base64-image')]`)
    .map(node => node.getAttribute('ref'))
    .map(getDynamicDefaultNode(xmlDoc))
    .filter(Boolean)
    .forEach(moveDynamicDefaultValueToInstance(xmlDoc));
};

const createItemForInstanceNode = (xmlDoc, parentNode) => (itemNode) => {
  const children = Array.from(itemNode.childNodes);
  const itextIdNode = children.find(n => n.nodeName === 'itextId');
  const nameNode = children.find(n => n.nodeName === 'name');
  if (!itextIdNode || !nameNode) {
    return;
  }

  const itemElem = xmlDoc.createElement('item');
  const labelElem = xmlDoc.createElement('label');
  labelElem.setAttribute('ref', `jr:itext('${itextIdNode.textContent}')`);
  itemElem.appendChild(labelElem);
  const valueElem = xmlDoc.createElement('value');
  valueElem.textContent = nameNode.textContent;
  itemElem.appendChild(valueElem);
  parentNode.appendChild(itemElem);
};

const getInstanceIdFromNodeset = (itemsetNode) => {
  return itemsetNode
    .getAttribute('nodeset')
    .match(/^instance\('([^']+)'\)/)[1];
};

const insertSelectItemsWithMedia = (xmlDoc, instanceNode) => (itemSetNode) => {
  const { parentNode } = itemSetNode;
  const instanceId = getInstanceIdFromNodeset(itemSetNode);
  if (!instanceId) {
    return;
  }

  getNodes(instanceNode, 'root/item')
    .forEach(createItemForInstanceNode(xmlDoc, parentNode));
  removeXmlNode(itemSetNode);
};

const removeXmlNode = node => node.parentNode.removeChild(node);

/**
 * Removes the "NO_LABEL" labels placeholder. XLSForm does not allow converting a field without a label, so the CHT
 * convention is to use a "NO_LABEL" placeholder value.
 */
const removeNoLabels = (xmlDoc) => {
  const noLabelItextNodes = getNodes(xmlDoc, `${XPATH_MODEL}/itext/translation//text[count(*)=1 and value="NO_LABEL"]`);
  const noLabelNodeIds = Array.from(new Set(noLabelItextNodes.map(textNode => textNode.getAttribute('id'))));
  noLabelNodeIds
    .flatMap(id => getNodes(xmlDoc, `${XPATH_BODY}//label[@ref="jr:itext('${id}')"]`))
    .forEach(removeXmlNode);
  noLabelItextNodes.forEach(removeXmlNode);

  // Remove any additional NO_LABEL values from translation nodes that have other (multimedia) values
  getNodes(xmlDoc, `${XPATH_MODEL}/itext/translation//value[text()="NO_LABEL"]`)
    .forEach(removeXmlNode);
};

const removeExtraRepeatInstance = (xmlDoc) => {
  getNodes(xmlDoc, `${XPATH_MODEL}/instance//*[@jr:template=""]`)
    .map(({ parentNode, nodeName }) => getNode(parentNode, `./${nodeName}[not(@jr:template="")]`))
    .filter(Boolean)
    .forEach(removeXmlNode);
};

const insertMediaSelectItemsForInstance = (xmlDoc) => (instanceNode) => {
  const instanceId = instanceNode.getAttribute('id');
  getNodes(xmlDoc, `${XPATH_BODY}//itemset[@nodeset="instance('${instanceId}')/root/item"]`)
    .forEach(insertSelectItemsWithMedia(xmlDoc, instanceNode));
};

/**
 * Selects no longer include all item elements in the body, but instead the choices data is stored centrally as an
 * instance and referenced in the body as an itemset. Unfortunately, this approach breaks the CHT logic for properly
 * updating the media src urls associated with the choices. So, for these selects, we replace the itemset with the
 * actual item elements, which the CHT logic can then handle as before.
 *
 * This is a temporary workaround until we can update the CHT logic to properly handle itemsets with media.
 * https://github.com/XLSForm/pyxform/pull/614
 * @param xmlDoc
 */
const replaceItemSetsWithMedia = (xmlDoc) => {
  const mediaXpath = `${XPATH_MODEL}/itext/translation/text[value[@form="image" or @form="audio" or @form="video"]]`;
  const allInstanceIdsWithMedia = getNodes(xmlDoc, mediaXpath)
    .map(textNode => textNode.getAttribute('id'))
    .map(id => id.match(/^(.+)-\d+$/))
    .filter(Boolean)
    .map(([,match]) => match);
  const instanceNodes = Array
    .from(new Set(allInstanceIdsWithMedia))
    .map(instanceId => getInstanceNode(xmlDoc, instanceId))
    .filter(Boolean);
  instanceNodes.forEach(insertMediaSelectItemsForInstance(xmlDoc));
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
