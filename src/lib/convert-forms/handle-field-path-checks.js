const { getNodes, XPATH_MODEL } = require('../forms-utils');
const { info, warn} = require('../log');
const joi = require('joi');

const XML_ATT_NODESET = 'nodeset';

const KEY_WARN_LENGTH = 'warn_length';
const KEY_ERROR_LENGTH = 'error_length';
const KEY_IGNORE_LIST = 'ignore_list';
const KEY_RESERVED_LIST = 'reserved_list';
const DEFAULT = {
  [KEY_WARN_LENGTH]: 100,
  [KEY_ERROR_LENGTH]: 138
};

const propsSchema = joi.object({
  [KEY_WARN_LENGTH]: joi.number().integer().min(0).optional()
    .default(DEFAULT[KEY_WARN_LENGTH]),
  [KEY_ERROR_LENGTH]: joi.number().integer().min(0).optional()
    .default(DEFAULT[KEY_ERROR_LENGTH]),
  [KEY_IGNORE_LIST]: joi.array().items(joi.string()).optional()
    .custom(processListInput, 'process list input').default([new Set(), []]),
  [KEY_RESERVED_LIST]: joi.array().items(joi.string()).optional()
    .custom(processListInput, 'process list input').default([new Set(), []])
});

function processListInput(e) {
  const set = new Set([]);
  const invalidPaths = [];
  
  for(const entry of e){
    if(/[`'"]/.test(entry)){
      invalidPaths.push(entry);
    }
    else {
      set.add(entry);
    }
  }

  return [set, invalidPaths];
}

function formatFeedbackMsg(title, items, footer){
  return `${title}\n${items.join('\n')}\n${footer}`;
}

function checkLengthEntries(warnLength, errorLength){
  if(errorLength && warnLength && warnLength >= errorLength){
    throw new Error('The error length needs to be larger than the warn length.');
  }
}

function checkInvalidListEntries(entries, label){
  if(entries.length > 0){
    throw new Error(formatFeedbackMsg(
      `The following ${label} entries are invalid:`, 
      entries, 
      'Please fix or remove where appropriate.'
    ));
  }
}

function checkListOverlap(ignoreSet, reservedSet){
  if(!ignoreSet.size || !reservedSet.size){
    return;
  }

  const overlap = [];
  for(const ignore of ignoreSet){
    if(reservedSet.has(ignore)){
      overlap.push(ignore);
    }
  }

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
    // DEFAULT values will still apply through the joi schema validation
    info('No var restriction properties provided, using defaults: ', DEFAULT);
    info('If you would like to customize these checks, please create a properties JSON file with the structure:', {
      [KEY_WARN_LENGTH]: 'positive integer (optional, default: 100, disable by setting to 0)',
      [KEY_ERROR_LENGTH]: 'positive integer (optional, default: 138, disable by setting to 0)',
      [KEY_IGNORE_LIST]: 'array of strings representing nodeset paths to ignore (optional)',
      [KEY_RESERVED_LIST]: 'array of strings representing reserved keywords (optional)'
    });
  }

  const { error, value } = propsSchema.validate(props??{}, { abortEarly: false });
  if (error) {
    throw new Error(error.details.map(d => d.message).join('; '));
  }

  const warnLength = value[KEY_WARN_LENGTH];
  const errorLength = value[KEY_ERROR_LENGTH];
  const [ignoreSet, invalidIgnoreEntries] = value[KEY_IGNORE_LIST];
  const [reservedSet, invalidReservedEntries] = value[KEY_RESERVED_LIST];

  checkLengthEntries(warnLength, errorLength);
  checkInvalidListEntries(invalidIgnoreEntries, 'ignored');
  checkInvalidListEntries(invalidReservedEntries, 'reserved');
  checkListOverlap(ignoreSet, reservedSet);

  return { warnLength, errorLength, ignoreSet, reservedSet };
}

function buildExclusionPath(set){
  if(!set.size){
    return '';
  }
  const conditions = Array.from(set).map(v => `@${XML_ATT_NODESET} = "${v}"`).join(' or ');
  return `[not(${conditions})]`;
}

function getBindNodes(xmlDoc, ignoreSet){
  return getNodes(
    xmlDoc,
    `${XPATH_MODEL}/bind${buildExclusionPath(ignoreSet)}`
  );
}

function processBindNodes(bindNodes, warnLength, errorLength, reservedSet){
  const reserved = [];
  const errorNodes = [];
  const warnNodes = [];

  for (const bind of bindNodes) {
    const nodeset = bind.getAttribute(XML_ATT_NODESET);
    const stripped = nodeset.replace(/\/data/, '');
    const length = stripped.length;

    if (reservedSet.has(stripped)){
      reserved.push(stripped);
    }
    if (errorLength > 0 && length >= errorLength) {
      errorNodes.push(stripped);
    }
    if (warnLength > 0 && length >= warnLength) {
      warnNodes.push(stripped);
    }
  }

  return { reserved, errorNodes, warnNodes };
}

function handleFormVarResults(reserved, warnObj, errorObj){
  if(reserved.length > 0){
    throw new Error(formatFeedbackMsg(
      'The following reserved entries were found in the form:',
      reserved,
      'Please remove or rename as appropriate.'
    ));
  }
  if(errorObj.errorNodes.length > 0){
    throw new Error(formatFeedbackMsg(
      `The following vars are longer than the acceptable var length (${errorObj.errorLength}):`,
      errorObj.errorNodes,
      'Please simplify nesting or remove verbosity.'
    ));
  }
  else if(warnObj.warnNodes.length > 0){
    warn(formatFeedbackMsg(
      `The following vars are longer than the acceptable var length (${warnObj.warnLength}):`,
      warnObj.warnNodes,
      'Please consider simplifying nesting or removing verbosity.'
    ));
  }
}

function checkFieldPaths(xmlDoc, props) {
  const varConfig = processPropData(props);
  const { warnLength, errorLength, ignoreSet, reservedSet } = varConfig;

  if(!warnLength && !errorLength && reservedSet.size === 0){
    info('Warn and error lengths and reserved list not provided. Skipping field path checks.');
  }
  
  const bindNodes = getBindNodes(xmlDoc, ignoreSet);
  const { reserved, errorNodes, warnNodes } = processBindNodes(bindNodes, warnLength, errorLength, reservedSet);
  handleFormVarResults(reserved, { warnNodes, warnLength }, { errorNodes, errorLength } );
}

module.exports = {
  checkFieldPaths
};
