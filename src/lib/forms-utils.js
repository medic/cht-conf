const xpath = require('xpath');
const fs = require('./sync-fs');

const XPATH_MODEL = '/h:html/h:head/model';
const XPATH_BODY = '/h:html/h:body';

const getNode = (currentNode, path) =>
  xpath.parse(path).select1({ node: currentNode, allowAnyNamespaceForNoPrefix: true });

const getNodes = (currentNode, path) =>
  xpath.parse(path).select({ node: currentNode, allowAnyNamespaceForNoPrefix: true });

const getFullNodePath = (childNode) => {
  if (childNode.nodeType !== 1) {
    return '';
  }
  const parentPath = getFullNodePath(childNode.parentNode);
  return parentPath + '/' + childNode.nodeName;
};

module.exports = {
  XPATH_MODEL,
  XPATH_BODY,

  /**
   * Get the full path of the form, or null if the path doesn't exist.
   * @returns {string|null}
   */
  getFormDir: (projectDir, subDirectory) => {
    const formsDir = `${projectDir}/forms/${subDirectory}`;
    if(fs.exists(formsDir)) {
      return formsDir;
    }
    return null;
  },

  /**
   * Get paths related with the form.
   * @param {string} formsDir the full path of the form directory
   * @param {string} fileName the file name, eg. user_create.xml
   * @returns {{mediaDir: string, xformPath: string, baseFileName: string, filePath: string}}
   */
  getFormFilePaths: (formsDir, fileName) => {
    const baseFileName = fs.withoutExtension(fileName);
    return {
      baseFileName,
      mediaDir: `${formsDir}/${baseFileName}-media`,
      xformPath: `${formsDir}/${baseFileName}.xml`,
      filePath: `${formsDir}/${fileName}`
    };
  },

  /**
   * Returns the node from the form XML specified by the given XPath.
   * @param {Element} currentNode the current node in the form XML document
   * @param {string} path the XPath expression
   * @returns {Element} the selected node or `undefined` if not found
   */
  getNode,

  /**
   * Returns the nodes from the form XML specified by the given XPath.
   * @param {Element} currentNode the current node in the form XML document
   * @param {string} path the XPath expression
   * @returns {Element} the selected nodes or an empty array if none are found
   */
  getNodes,

  /**
   * Returns the `bind` nodes for the given form XML.
   * @param {Document} xmlDoc the form XML document
   * @returns {Element}
   */
  getBindNodes: xmlDoc => getNodes(xmlDoc, `${XPATH_MODEL}/bind`),

  /**
   * Returns the `instance` node with the given ID for the given form XML.
   * @param {Document} xmlDoc the form XML document
   * @param instanceId the id of the instance
   * @returns {Element} the selected node or `undefined` if not found
   */
  getInstanceNode: (xmlDoc, instanceId) => getNode(xmlDoc, `${XPATH_MODEL}/instance[@id='${instanceId}']`),

  /**
   * Returns the primary (first) `instance` node for the given form XML.
   * @param {Document} xmlDoc the form XML document
   * @returns {Element}
   */
  getPrimaryInstanceNode: xmlDoc => getNode(xmlDoc, `${XPATH_MODEL}/instance`),

  /**
   * Returns the path to the given child node relative to the primary instance node.
   * This is useful for identifying the node in error/warning messages.
   * @param childNode the child node
   * @returns {string}
   */
  getPrimaryInstanceNodeChildPath: (childNode) => getFullNodePath(childNode)
    .replace(`${XPATH_MODEL}/instance`, ''),

  /**
   * Check whether the XForm has the <instanceID/> tag.
   * @param {string} xmlDoc the XML document
   * @returns {boolean}
   */
  formHasInstanceId: xmlDoc => getNode(xmlDoc, `//meta/instanceID`) !== undefined,

  // This isn't really how to parse XML, but we have fairly good control over the
  // input and this code is working so far.  This may break with changes to the
  // formatting of output from xls2xform.
  /**
   * Get the title string inside the <h:title> tag
   * @param {string} xml the XML string
   * @returns {string}
   */
  readTitleFrom: xml =>
    xml.substring(xml.indexOf('<h:title>') + 9, xml.indexOf('</h:title>')),

  /**
   * Get the ID of the form
   * @param {string} xml the XML string
   * @returns {string}
   */
  readIdFrom: xml => /<model.*>[^]*<instance>[^]*id="([^"]*)"[^]*<\/instance>[^]*<\/model>/.exec(xml)?.[1],

  /**
   * Escape whitespaces in a path.
   * @param {string} path the path string
   * @returns {string}
   */
  escapeWhitespacesInPath: path => path.replace(/(\s+)/g, '\\$1'),
};
