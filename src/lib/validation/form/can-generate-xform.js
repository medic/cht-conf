const { formHasInstanceId } = require('../../forms-utils');
const api = require('../../api');

module.exports = {
  requiresInstance: true,
  execute: async ({ xformPath, xmlStr }) => {
    const warnings = [];
    const errors = [];

    if(!formHasInstanceId(xmlStr)) {
      return { errors, warnings };
    }

    try {
      const resp = await api().formsValidate(xmlStr);
      if (resp.formsValidateEndpointFound === false) {
        warnings.push('Form validation endpoint not found in your version of CHT Core, no form will be checked before push');
      }
    } catch (err) {
      errors.push(`Error found while validating "${xformPath}". Validation response: ${err.message}`);
    }

    return { errors, warnings };
  }
};
