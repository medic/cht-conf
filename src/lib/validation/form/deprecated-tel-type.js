const semver = require('semver');
const { getBindNodes } = require('../../forms-utils');

const validateDeprecatedTelType = async({xformPath, xmlDoc, apiVersion}) => {
  if(!apiVersion)
  {
    return {errors:[], warnings:[]};
  }

  if(semver.lt(apiVersion, '4.11.0'))
  {
    return {errors:[], warnings:[]};
  }

  const warnings = [];

  const telNodesets = getBindNodes(xmlDoc)
    .filter(bind => bind.getAttribute('type') === 'tel')
    .map(bind => bind.getAttribute('nodeset'))
    .filter(Boolean);
    
  if(telNodesets.length)
  {
    warnings.push(
      `Form at ${xformPath} contains the following phone number fields with the deprecated 'tel' type [${telNodesets.join(', ')}]. Follow the documentation to update these fields to the supported type:\nhttps://docs.communityhealthtoolkit.org/building/forms/app/#phone-number-input`
    );
  }

  return {errors:[], warnings};
};

module.exports = {
  requiresInstance: true,
  skipFurtherValidation: false,
  execute: validateDeprecatedTelType
};
