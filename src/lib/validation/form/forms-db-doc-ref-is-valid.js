const { getPrimaryInstanceNode, getNodes, getNode, getPrimaryInstanceNodeChildPath } = require('../../forms-utils');

module.exports = {
  id: 'forms-db-doc-ref-is-valid',
  name: 'instance::db-doc-ref form validation',
  description: 'Checks that instance::db-doc-ref points to a valid group.',
  requiresInstance: false,

  execute: ({ xmlDoc, xformPath }) => {
    const errors = [];
    const header = `Form at ${xformPath} contains invalid db-doc-ref configuration:`;

    const primaryInstance = getPrimaryInstanceNode(xmlDoc);
    if (!primaryInstance) {
      return { errors: [] }; // Cannot validate if there's no primary instance
    }

    // Use helper functions to find all nodes with a 'db-doc-ref' attribute
    const refNodes = getNodes(xmlDoc, '//*[@db-doc-ref]', primaryInstance);

    refNodes.forEach(node => {
      const refPath = node.getAttribute('db-doc-ref');

      // Use a helper function to find the node the path is pointing to
      const targetNode = getNode(xmlDoc, refPath, primaryInstance);

      // The new, simplified validation logic
      if (!targetNode || (targetNode !== primaryInstance && targetNode.getAttribute('db-doc') !== 'true')) {
        const fieldPath = getPrimaryInstanceNodeChildPath(node);
        errors.push(` - The attribute "db-doc-ref" on field "${fieldPath}" must point to the primary instance node or a group with the "db-doc" attribute.`);
      }
    });

    if (errors.length > 0) {
      return { errors: [{ header, errors }] };
    }
    return { errors: [] };
  },
};