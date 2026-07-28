const { getBindNodes } = require('../../forms-utils');
const joi = require('joi');

const XML_ATT_NODESET = 'nodeset';

const schema = joi.object({
  ['warn_length']: joi.number().integer().min(0).when('error_length', {
    is: joi.number().required().greater(0),
    then: joi.number().less(joi.ref('error_length')),
  }).optional(),
  ['error_length']: joi.number().integer().min(0).optional(),
  ['ignore_list']: joi.array().items(joi.string().pattern(/[`'"]/, { invert: true })).optional().default([]),
  ['reserved_list']: joi.array().items(joi.string().pattern(/[`'"]/, { invert: true })).optional().default([]),
});

function formatFeedbackMsg(title, items, footer) {
  const footerText = footer ? `\n${footer}` : '';
  return `${title}\n${items.join('\n')}${footerText}`;
}

function checkListOverlap(ignoreList, reservedList) {
  if (!ignoreList.length || !reservedList.length) {
    return;
  }

  const reservedSet = new Set(reservedList);
  const overlap = ignoreList.filter(x => reservedSet.has(x));

  if (overlap.length > 0) {
    throw new Error(formatFeedbackMsg(
      'Overlap between reserved and ignore lists:',
      overlap,
      'Please remove where appropriate.'
    ));
  }
}

function warnIfNoProps(props) {
  if (!props || Object.keys(props).length === 0) {
    return formatFeedbackMsg(
      'If you would like enable form field linting, please ensure the object has the following structure:',
      [
        '"warn_length": "positive integer (optional)"',
        '"error_length": "positive integer (optional)"',
        '"ignore_list": "array of strings representing nodeset paths to ignore (optional)"',
        '"reserved_list": "array of strings representing reserved keywords (optional)"'
      ]
    );
  }
}

function validatePropDataOrThrow(props) {
  const { error, value } = schema.validate(props, { abortEarly: false });
  if (error) {
    throw new Error(error.details.map(d => d.message).join('; '));
  }
  return value;
}

function unpackProps(props) {
  const warnLength = props['warn_length'];
  const errorLength = props['error_length'];
  const ignoreList = props['ignore_list'];
  const reservedList = props['reserved_list'];

  return { warnLength, errorLength, ignoreList, reservedList };
}

function buildExclusionPath(list) {
  if (!list.length) {
    return '';
  }
  const conditions = Array.from(list).map(v => `@${XML_ATT_NODESET} = "${v}"`).join(' or ');
  return `[not(${conditions})]`;
}

function getFilteredBindNodes(xmlDoc, ignoreList) {
  return getBindNodes(xmlDoc, buildExclusionPath(ignoreList));
}

function getNodePath(node) {
  return node.getAttribute(XML_ATT_NODESET).replace(/\/data/, '');
}

function getPathsWithLength(bindNodePaths, targetLength) {
  if (!targetLength) {
    return [];
  }

  return bindNodePaths.filter(path => path.length >= targetLength);
}

function validateReservedNodes(bindNodePaths, reserved) {
  const reservedNodes = bindNodePaths.filter(path => reserved.includes(path));
  if (reservedNodes.length > 0) {
    throw new Error(formatFeedbackMsg(
      'The following reserved entries were found in the form:',
      reservedNodes,
      'Please remove or rename as appropriate.'
    ));
  }
}

function validateWarnLength(bindNodePaths, warnLength) {
  const warnLengthPaths = getPathsWithLength(bindNodePaths, warnLength);
  if (warnLengthPaths.length > 0) {
    return formatFeedbackMsg(
      `The following vars are longer than the acceptable var length (${warnLength}):`,
      warnLengthPaths,
      'Please consider simplifying nesting or removing verbosity.'
    );
  }
}

function validateErrorLength(bindNodePaths, errorLength) {
  const errorLengthPaths = getPathsWithLength(bindNodePaths, errorLength);
  if (errorLengthPaths.length > 0) {
    throw new Error(formatFeedbackMsg(
      `The following vars are longer than the acceptable var length (${errorLength}):`,
      errorLengthPaths,
      'Please simplify nesting or remove verbosity.'
    ));
  }
}

function validateFieldPaths(xmlDoc, props) {
  const propWarning = warnIfNoProps(props);
  if(propWarning){
    return [ propWarning ];
  }

  const validatedProps = validatePropDataOrThrow(props);

  const { warnLength, errorLength, ignoreList, reservedList } = unpackProps(validatedProps);

  checkListOverlap(ignoreList, reservedList);
  const bindNodes = getFilteredBindNodes(xmlDoc, ignoreList);
  const bindNodePaths = bindNodes.map(node => getNodePath(node));
  validateReservedNodes(bindNodePaths, reservedList);
  validateErrorLength(bindNodePaths, errorLength);
  const warning = validateWarnLength(bindNodePaths, warnLength);

  return warning ? [ warning ] : [];
}

async function execute({ xmlDoc, propsData }) {
  const warnings = [];
  const errors = [];
  try {
    if(!propsData || !('field_path_linting' in propsData) ){
      return { warnings, errors };
    }

    warnings.push(...validateFieldPaths(xmlDoc, propsData['field_path_linting']));
  }
  catch (e) {
    errors.push(e.message);
  }

  return { warnings, errors };
}

module.exports = {
  requiresInstance: false,
  skipFurtherValidation: true,
  execute
};
