const { formHasInstanceId } = require('../../forms-utils');

module.exports = {
  requiresInstance: false,
  execute: async ({ xformPath, xmlStr }) => {
    const errors = [];
    if(!formHasInstanceId(xmlStr)) {
      errors.push(`Form at ${xformPath} appears to be missing <meta><instanceID/></meta> node. This form will not work on CHT webapp.`);
    }

    return { errors };
  }
};
