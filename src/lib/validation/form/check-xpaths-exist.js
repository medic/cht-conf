/*
An XPath expression that evaluates to an empty result (e.g. no node is found in the document that matches the
expression) is technically "valid" (in the sense that it is a properly formatted XPath expression).

However, if there is a "simple" XPath expression (one that just references a node via an absolute/relative path and does
not contain any dynamic processing) in a form that does not evaluate to an actual node in the form, that is almost
certainly an error (since it could never return any other result). This validation checks the simple XPaths in a form's
calculate, constraint, readonly, relevant, and required expressions and returns an error for any simple XPaths that
point to a non-existant node. More complex dynamic XPath expressions are not validated (since their results could vary
at runtime depending on the data in the form).
*/

const { getNode, getBindNodes, getPrimaryInstanceNode } = require('../../forms-utils');

// TODO Refactor and document
const XPATH_SPECIAL_CHARS = /\/\/|[*@:[\]]/g;
const XPATH_PATTERN = /[/\w.*@:[\]-]*\/[/\w.*@:[\]-]+/g;

const extractSimpleXpaths = (expression) => {
  return (expression.match(XPATH_PATTERN) || [])
    .filter(xpath => xpath.startsWith('/') || xpath.startsWith('./') || xpath.startsWith('../'))
    .filter(xpath => !xpath.match(XPATH_SPECIAL_CHARS));
};

const isValidXpath = (nodeset, xpathToValidate, instance) => {
  if(xpathToValidate.startsWith('/')) {
    // Absolute XPath. Evaluate it relative to the instance
    return getNode(instance, xpathToValidate.substring(1));
  }

  // Relative XPath. Evaluate it relative to the current node
  const currentNode = getNode(instance, nodeset.substring(1));
  if(!currentNode) {
    throw new Error(`Could not find model node referenced by bind nodeset: ${nodeset}`);
  }

  return getNode(currentNode, xpathToValidate);
};

const extractInvalidXPaths = (nodeset, expression, instance) => {
  return extractSimpleXpaths(expression)
    .filter(xpath => !isValidXpath(nodeset, xpath, instance));
};

const getField = (bind, instance) => {
  const nodeset = bind.getAttribute('nodeset');
  const getInvalidXPaths = (expression) => extractInvalidXPaths(nodeset, expression, instance);

  return {
    nodeset,
    calculate: getInvalidXPaths(bind.getAttribute('calculate')),
    constraint: getInvalidXPaths(bind.getAttribute('constraint')),
    readonly: getInvalidXPaths(bind.getAttribute('readonly')),
    relevant: getInvalidXPaths(bind.getAttribute('relevant')),
    required: getInvalidXPaths(bind.getAttribute('required')),
  };
};

const keepFieldsWithXPaths = (field) => {
  return field.calculate.length ||
    field.constraint.length ||
    field.readonly.length ||
    field.relevant.length ||
    field.required.length;
};

const getFieldsWithInvalidXPaths = (xmlDoc) => {
  const instance = getPrimaryInstanceNode(xmlDoc);
  if(!instance) {
    throw new Error('No instance found in form XML.');
  }
  return getBindNodes(xmlDoc)
    .map(bind => getField(bind, instance))
    .filter(field => keepFieldsWithXPaths(field));
};

module.exports = {
  requiresInstance: false,
  skipFurtherValidation: false,
  execute: async({ xformPath, xmlDoc }) => {
    const errors = [];
    try {
      const fields = getFieldsWithInvalidXPaths(xmlDoc);
      if(fields.length) {
        errors.push(`Form at ${xformPath} contains invalid XPath expressions (absolute or relative paths that refer to a non-existant node):`);

        fields.forEach(field => {
          const recordError = (expressionName) => {
            const xpaths = field[expressionName];
            if(xpaths.length) {
              errors.push(`  - ${expressionName} for ${field.nodeset} contains ${xpaths}`);
            }
          };
          recordError('calculate');
          recordError('constraint');
          recordError('readonly');
          recordError('relevant');
          recordError('required');
        });
      }
    } catch(e) {
      errors.push(`Error encountered while validating XPaths in form at ${xformPath}: ${e.message}`);
    }

    return { errors, warnings: [] };
  }
};
