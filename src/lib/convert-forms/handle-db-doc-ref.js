const {
  getNodes,
  XPATH_MODEL,
  getPrimaryInstanceNodeChildPath,
  getNode
} = require('../forms-utils');

const SIMPLE_XPATH_PATTERN = /^[/\w.-]+$/;

const getNodesWithDbDocRef = xmlDoc => {
  return getNodes(xmlDoc, `${XPATH_MODEL}/instance//*[@db-doc-ref]`)
    .filter(node => node.getAttribute('db-doc-ref').trim() !== '');
};

const isFormReference = (primaryInstanceNode, dbDocRef) => dbDocRef === `/${primaryInstanceNode.getAttribute('id')}`;
const isRelativePath = dbDocRef => !dbDocRef.startsWith('/') && SIMPLE_XPATH_PATTERN.test(dbDocRef);

const getCompatibleDbDocRef = (xmlDoc, node) => {
  const currentDbDocRef = node.getAttribute('db-doc-ref').trim();
  const absolutePath = getPrimaryInstanceNodeChildPath(node);
  const [, dataInstanceName] = absolutePath.split('/');
  const primaryInstanceNode = getNode(xmlDoc, `${XPATH_MODEL}/instance/${dataInstanceName}`);
  if (isFormReference(primaryInstanceNode, currentDbDocRef)) {
    return `/${dataInstanceName}`;
  }
  if (isRelativePath(currentDbDocRef)) {
    const targetNode = getNode(node, currentDbDocRef);
    if (targetNode) {
      return getPrimaryInstanceNodeChildPath(targetNode);
    }
  }

  return currentDbDocRef;
};

module.exports = {
  /**
   * Pyxform is now using relative paths for any field expressions inside a repeat. The instance::db-doc-ref
   * functionality in cht-core does not handle relative paths properly. So we replace these with absolute paths.
   * Additionally, the way to set your form field to the _id value for document currently being written is to set the
   * db-doc-ref to "/<form_id>". Technically the `form_id` was the node name of the primary instance in the XForm xml.
   * However, Pyxform now just uses `data` as the node name of the primary instance node for all forms. So, the logic
   * in cht-core for handling db-doc-ref="/<form_id>" breaks. This function also replaces any db-doc-ref attributes
   * that reference the form's own id with the correct node name of the primary instance node.
   */
  handleDbDocRefs: (xmlDoc) => {
    getNodesWithDbDocRef(xmlDoc)
      .forEach((node) => node.setAttribute('db-doc-ref', getCompatibleDbDocRef(xmlDoc, node)));
  }
};
