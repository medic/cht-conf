const { getPrimaryInstanceNode, getNodes } = require('../../forms-utils');

module.exports = {
  name: 'db-doc-is-valid.js',
  execute: async ({ xmlDoc, xformPath }) => {
    const errors = [];
    const header = `Form at ${xformPath} contains invalid db-doc configuration:`;

    const primaryInstance = getPrimaryInstanceNode(xmlDoc);
    if (!primaryInstance) {
      return { errors: [] };
    }

    const dbDocNodes = getNodes(xmlDoc, '//*[@db-doc="true"]', primaryInstance);

    dbDocNodes.forEach(node => {
      if (node.nodeName !== 'group') {
        errors.push(`instance::db-doc is only supported on group fields. Found on: <${node.nodeName}>.`);
      } else {
        const childNodes = Array.from(node.childNodes).filter(n => n.nodeType === 1);
        const hasTypeField = childNodes.some(
          child => child.tagName === 'type' || child.getAttribute('name') === 'type'
        );
        if (!hasTypeField) {
          errors.push(`instance::db-doc groups must contain a field with name="type".`);
        }
      }
    });

    if (errors.length > 0) {
      return { errors: [header, ...errors] };
    }

    return { errors: [], warnings: [] };
  }
};
