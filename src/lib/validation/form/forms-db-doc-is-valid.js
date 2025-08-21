const xpath = require('xpath');

module.exports = {
  id: 'forms-db-doc-is-valid',
  name: 'instance::db-doc form validation',
  description: 'Checks that instance::db-doc is used on a group and that the group contains a type field.',
  requiresInstance: false,

  execute: ({ xmlDoc, xformPath }) => {
    const errors = [];
    const header = `Form at ${xformPath} contains invalid db-doc configuration:`;

    const dbDocNodes = xpath.select('//*[@db-doc="true"]', xmlDoc);

    dbDocNodes.forEach(node => {
      const fieldPath = node.tagName;
      const childNodes = Array.from(node.childNodes).filter(n => n.nodeType === 1);

      if (childNodes.length === 0) {
        errors.push(` - ${fieldPath}: the db-doc attribute must only be set on groups.`);
      } else {
        const hasTypeField = childNodes.some(child => child.tagName === 'type');
        if (!hasTypeField) {
          errors.push(` - ${fieldPath}: groups configured with the db-doc attribute must contain a valid type field.`);
        }
      }
    });

    if (errors.length > 0) {
      return { errors: [{ header, errors }] };
    }

    return { errors: [] };
  },
};
