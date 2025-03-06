const { formHasInstanceId } = require('../../forms-utils');

module.exports = {
  requiresInstance: false,
  skipFurtherValidation: true,
  execute: async({ xformPath, xmlDoc }) => {
    const errors = [];
    if(!formHasInstanceId(xmlDoc)) {
      errors.push(
        `Form at ${xformPath} appears to be missing <meta><instanceID/></meta> node. `
        + 'This form will not work on CHT webapp.'
      );
    }

    return { errors, warnings: [] };
  }
};
