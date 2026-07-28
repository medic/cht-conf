const { getBindNodes } = require('../forms-utils');
const { warn, error: err } = require('../log');
const joi = require('joi');

const XML_ATT_NODESET = 'nodeset';

const propsSchema = joi.object({
  ['warn_length']: joi.number().integer().min(0).when('error_length', {
    is: joi.number().required().greater(0),
    then: joi.number().less(joi.ref('error_length')),
  }).optional(),
  ['error_length']: joi.number().integer().min(0).optional(),
  ['ignore_list']: joi.array().items(joi.string().pattern(/[`'"]/, { invert: true })).optional().default([]),
  ['reserved_list']: joi.array().items(joi.string().pattern(/[`'"]/, { invert: true })).optional().default([]),
});

function formatFeedbackMsg(title, items, footer){
  return `${title}\n${items.join('\n')}\n${footer}`;
}

function checkListOverlap(ignoreList, reservedList){
  if(!ignoreList.length || !reservedList.length){
    return;
  }

  const reservedSet = new Set(reservedList);
  const overlap = ignoreList.filter(x => reservedSet.has(x));

  if(overlap.length > 0){
    throw new Error(formatFeedbackMsg(
      'Overlap between reserved and ignore lists:',
      overlap,
      'Please remove where appropriate.'
    ));
  }
}

function processPropData(props){
  if(!props || Object.keys(props).length === 0){
    err('If you would like to customize these checks, please create a properties JSON file with the structure:', {
      'warn_length': 'positive integer (required)',
      'error_length': 'positive integer (required)',
      'ignore_list': 'array of strings representing nodeset paths to ignore (optional)',
      'reserved_list': 'array of strings representing reserved keywords (optional)'
    });
    throw Error('Unable to run field path checks');
  }

  const { error, value } = propsSchema.validate(props??{}, { abortEarly: false });
  if (error) {
    throw new Error(error.details.map(d => d.message).join('; '));
  }

  const warnLength = value['warn_length'];
  const errorLength = value['error_length'];
  const ignoreList = value['ignore_list'];
  const reservedList = value['reserved_list'];

  checkListOverlap(ignoreList, reservedList);

  return { warnLength, errorLength, ignoreList, reservedList };
}

function buildExclusionPath(list){
  if(!list.length){
    return '';
  }
  const conditions = Array.from(list).map(v => `@${XML_ATT_NODESET} = "${v}"`).join(' or ');
  return `[not(${conditions})]`;
}

function getFilteredBindNodes(xmlDoc, ignoreList){
  return getBindNodes(xmlDoc, buildExclusionPath(ignoreList));
}

function getNodePath(node){
  return node.getAttribute(XML_ATT_NODESET).replace(/\/data/, '');
}

function getPathsWithLength(bindNodePaths, targetLength){
  if(!targetLength){
    return [];
  }

  return bindNodePaths.filter(path => path.length >= targetLength);
}

function validateReservedNodes(bindNodePaths, reserved) {
  const reservedNodes = bindNodePaths.filter(path => reserved.includes(path));
  if(reservedNodes.length > 0){
    throw new Error(formatFeedbackMsg(
      'The following reserved entries were found in the form:',
      reservedNodes,
      'Please remove or rename as appropriate.'
    ));
  }
}

function validateWarnLength(bindNodePaths, warnLength) {
  const warnLengthPaths = getPathsWithLength(bindNodePaths, warnLength);
  if(warnLengthPaths.length > 0){
    warn(formatFeedbackMsg(
      `The following vars are longer than the acceptable var length (${warnLength}):`,
      warnLengthPaths,
      'Please consider simplifying nesting or removing verbosity.'
    ));
  }
}

function validateErrorLength(bindNodePaths, errorLength) {
  const errorLengthPaths = getPathsWithLength(bindNodePaths, errorLength);
  if(errorLengthPaths.length > 0){
    throw new Error(formatFeedbackMsg(
      `The following vars are longer than the acceptable var length (${errorLength}):`,
      errorLengthPaths,
      'Please simplify nesting or remove verbosity.'
    ));
  }
}

function checkFieldPaths(xmlDoc, props) {
  const varConfig = processPropData(props);
  const { warnLength, errorLength, ignoreList, reservedList } = varConfig;
  
  const bindNodes = getFilteredBindNodes(xmlDoc, ignoreList);
  const bindNodePaths = bindNodes.map(node => getNodePath(node));
  validateReservedNodes(bindNodePaths, reservedList);
  validateErrorLength(bindNodePaths, errorLength);
  validateWarnLength(bindNodePaths, warnLength);
}

module.exports = {
  checkFieldPaths
};
