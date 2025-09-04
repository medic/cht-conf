const xpath = require('xpath');

// Helper function to get the root form node (the first child of the body tag)
const getRootNode = (doc) => {
  const body = xpath.select1('//*[local-name()="body"]', doc);
  return body ? xpath.select1('./*[1]', body) : null;
};

module.exports = {
  id: 'forms-db-doc-ref-is-valid',
  name: 'instance::db-doc-ref form validation',
  description: 'Checks that instance::db-doc-ref points to a valid group.',
  requiresInstance: false,

  execute: ({ DOMParser }, form, xformPath) => {
    const errors = [];
    const doc = new DOMParser().parseFromString(form, 'text/xml');
    const header = `Form at ${xformPath} contains invalid db-doc-ref configuration:`;

    // Define a namespace resolver for the 'instance' prefix
    const nsResolver = { lookupNamespaceURI: (prefix) => (prefix === 'instance' ? 'http://www.medic.com/xforms' : null) };

    // 1. Find all nodes that use the db-doc-ref attribute.
    const refNodes = xpath.select('//*[@instance:db-doc-ref]', doc, nsResolver);
    const rootNode = getRootNode(doc);

    refNodes.forEach(node => {
      const refPath = node.getAttributeNS('http://www.medic.com/xforms', 'db-doc-ref');
      const fieldName = node.tagName;

      // 2. Find the node that is being referenced by the path.
      const referencedNode = xpath.select1(refPath, doc);
      
      // CHECK 1: Does the referenced node exist?
      if (!referencedNode) {
        errors.push(` - Field "${fieldName}" references a non-existent node: "${refPath}".`);
        return; // No need for further checks if it doesn't exist
      }

      // CHECK 2: Is it actually a group (does it have child elements)?
      const childElements = Array.from(referencedNode.childNodes).filter(n => n.nodeType === 1);
      if (childElements.length === 0) {
        errors.push(` - Field "${fieldName}" references a node ("${refPath}") which is not a group.`);
        return;
      }

      // CHECK 3: Does the group have `db-doc="true"` OR is it the root form node?
      const hasDbDoc = referencedNode.getAttribute('db-doc') === 'true';
      const isRootNode = referencedNode === rootNode;

      if (!hasDbDoc && !isRootNode) {
        errors.push(` - The group referenced by "${fieldName}" ("${refPath}") must have a 'db-doc="true"' attribute or be the root form node.`);
      }
    });

    if (errors.length > 0) {
      return [{ header, errors }];
    }
  },
};