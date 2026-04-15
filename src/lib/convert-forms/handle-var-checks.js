const { getNodes, XPATH_MODEL, XML_ATT_NODESET } = require('../forms-utils');
const { info, warn} = require('../log');

const DEFAULT = {
  warn_length: 100,
  error_length: 138
};

function processLengthInput(n) {
  if(typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n) || n < 0 ){
    throw new Error('Please ensure that the warn/error length value is a positive integer');
  }

  return n;
}

function processListInput(e) {
  const set = new Set([]);
  const invalidPaths = [];

  if(!Array.isArray(e)){
    return [new Set(), []];
  }
  
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
  if(errorLength && warnLength >= errorLength){
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
  const warnLength = 'warn_length' in props ? processLengthInput(props.warn_length) : null;
  const errorLength = 'error_length' in props ? processLengthInput(props.error_length) : null;
  const [ignoreSet, invalidIgnoreEntries] = processListInput(props.ignore_list);
  const [reservedSet, invalidReservedEntries] = processListInput(props.reserved_list);
  
  if(!warnLength && !errorLength && reservedSet.size === 0){
    info('Warn and error lengths and reserved list not provided. Skipping var checks.');
    return;
  }

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
  return `and not(${conditions})`;
}

function getBindNodes(xmlDoc, ignoreSet){
  try {
    return getNodes(
      xmlDoc,
      `${XPATH_MODEL}/bind[starts-with(@${XML_ATT_NODESET}, "/data/") ${buildExclusionPath(ignoreSet)}]`
    );
  }
  catch (e){
    const key = 'Unterminated string literal: "';
    if(e.message?.includes(key)){
      const problemPath = e.message.substring(e.message.indexOf(key) + key.length, e.message.indexOf(')'));
      throw new Error(`Unable to find path: ${problemPath}`);
    }
    throw e;
  }
}

function processBindNodes(bindNodes, warnLength, errorLength, reservedSet){
  const reserved = [];
  const errorNodes = [];
  const warnNodes = [];

  function classifyNode(nodeset) {
    const length = nodeset.length;
    if (reservedSet.has(nodeset)){
      return 'reserved';
    }
    if (errorLength > 0 && length >= errorLength) {
      return 'error';
    }
    if (warnLength > 0 && length >= warnLength) {
      return 'warn';
    }
    return null;
  }

  for (const bind of bindNodes) {
    const nodeset = bind.getAttribute(XML_ATT_NODESET);
    switch (classifyNode(nodeset)) {
    case 'reserved':
      reserved.push(nodeset);
      break;
    case 'error':
      errorNodes.push(nodeset);
      break;
    case 'warn':
      warnNodes.push(nodeset);
      break;
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

function checkVars(xmlDoc, props) {
  const varConfig = processPropData(props ?? DEFAULT);
  if(!varConfig){
    return;
  }
  const { warnLength, errorLength, ignoreSet, reservedSet } = varConfig;
  
  const bindNodes = getBindNodes(xmlDoc, ignoreSet);
  if(!bindNodes || bindNodes.length === 0){
    info('Form did not contain any bind nodes');
    return;
  }

  const { reserved, errorNodes, warnNodes } = processBindNodes(bindNodes, warnLength, errorLength, reservedSet);
  handleFormVarResults(reserved, { warnNodes, warnLength }, { errorNodes, errorLength } );
}

module.exports = {
  checkVars
};
