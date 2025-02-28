const { getBindNodes } = require('../../forms-utils');

module.exports = {
  requiresInstance: false,
  skipFurtherValidation: false,
  execute: async({ xformPath, xmlDoc }) => {
    const errors = [];

    const requiredNotes = getBindNodes(xmlDoc)
      .filter(bind => bind.getAttribute('readonly') === 'true()') // Notes will not be conditionally readonly
      .filter(bind => {
        const required = bind.getAttribute('required');
        return required && required !== 'false()';
      })
      .filter(bind => bind.getAttribute('type') === 'string')
      .filter(bind => !bind.getAttribute('calculate'))
      .map(bind => bind.getAttribute('nodeset'));
    if(requiredNotes.length) {
      errors.push(
        `Form at ${xformPath} contains the following note fields with 'required' expressions: `
        + `[${requiredNotes.join(', ')}]`
      );
    }
    return { errors, warnings: [] };
  }
};
