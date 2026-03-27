const { getPrimaryInstanceNode, getNodes, getPrimaryInstanceNodeChildPath } = require('../../forms-utils');

module.exports = {
  requiresInstance: false,
  execute: async ({ xmlDoc, xformPath }) => {
    const errors = [];
    const primaryInstance = getPrimaryInstanceNode(xmlDoc);
    const dbDocNodes = getNodes(xmlDoc, '//*[@db-doc="true"]', primaryInstance);
    dbDocNodes.forEach(node => {
      const childNodes = node.childNodes.filter(n => n.nodeType === 1);
      if (!childNodes.length) {
        const nodeName = getPrimaryInstanceNodeChildPath(node);
        errors.push(`  - ${nodeName}: the db-doc attribute must only be set on groups.`);
        return;
      }
      const hasTypeField = childNodes.some(child => child.nodeName === 'type');
      if (!hasTypeField) {
        const nodeName = getPrimaryInstanceNodeChildPath(node);
        errors.push(`  - ${nodeName}: groups configured with the db-doc attribute must contain a valid type field.`);
      }
    });

    const header = `Form at ${xformPath} contains invalid db-doc configuration:`;
    return { errors: errors.length ? [header, ...errors]: errors };
  }
};
