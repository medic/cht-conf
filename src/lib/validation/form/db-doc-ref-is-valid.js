const { getPrimaryInstanceNode, getNodes, getNode, getPrimaryInstanceNodeChildPath } = require('../../forms-utils');

module.exports = {
  requiresInstance: false,
  execute: ({ xmlDoc, xformPath }) => {
    const errors = [];
    const primaryInstance = getPrimaryInstanceNode(xmlDoc);
    const formRootNode = Array
      .from(primaryInstance.childNodes)
      .find(n => n.nodeType === 1);
    const refNodes = getNodes(xmlDoc, '//*[@db-doc-ref]', primaryInstance);
    refNodes.forEach(node => {
      const refPath = node
        .getAttribute('db-doc-ref')
        .trim()
        .replace(/^\//, '');
      const targetNode = getNode(primaryInstance, refPath);
      if (!targetNode || (targetNode !== formRootNode && targetNode.getAttribute('db-doc') !== 'true')) {
        const nodeName = getPrimaryInstanceNodeChildPath(node);
        errors.push(`  - ${nodeName}: the db-doc-ref value [${refPath}] does not reference a valid doc node.`);
      }
    });

    const header = `Form at ${xformPath} contains invalid db-doc-ref configuration. A db-doc-ref value should point `
      + `to either the root node of the form or to a group that is adding a new doc (with db-doc set to "true"):`;
    return { errors: errors.length ? [header, ...errors]: errors };
  },
};
