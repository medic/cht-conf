const { getBindNodes } = require('../../forms-utils');
const joi = require('joi');

const XML_ATT_NODESET = 'nodeset';

const schema = joi.object({
  warn_length: joi.number().integer().min(0).when('error_length', {
    is: joi.number().required().greater(0),
    then: joi.number().less(joi.ref('error_length')),
  }).optional(),
  error_length: joi.number().integer().min(0).optional(),
  ignore_list: joi.array().items(joi.string().pattern(/[`'"]/, { invert: true })).optional().default([]),
  reserved_list: joi.array().items(joi.string().pattern(/[`'"]/, { invert: true })).optional().default([]),
});

function formatFeedbackMsg(title, items, footer) {
  return `${title}\n${items.join('\n')}\n${footer}`;
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

function validatePropDataOrThrow(props) {
  const { error, value } = schema.validate(props, { abortEarly: false });
  if (error) {
    throw new Error(error.details.map(d => d.message).join('; '));
  }
  return value;
}

function buildPath(entry) {
  return `/data/${entry.replace(/^\/?(data\/)?/, '')}`;
}

function unpackProps(props) {
  const warnLength = props['warn_length'];
  const errorLength = props['error_length'];
  const ignoreList = props['ignore_list'].map(buildPath);
  const reservedList = props['reserved_list'].map(buildPath);

  return { warnLength, errorLength, ignoreList, reservedList };
}

function buildExclusionPath(list) {
  if (!list.length) {
    return '';
  }
  const conditions = list.map(v => `@${XML_ATT_NODESET} = "${v}"`).join(' or ');
  return `[not(${conditions})]`;
}

function getFilteredBindNodes(xmlDoc, ignoreList) {
  return getBindNodes(xmlDoc, buildExclusionPath(ignoreList));
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
  const validatedProps = validatePropDataOrThrow(props);

  const { warnLength, errorLength, ignoreList, reservedList } = unpackProps(validatedProps);

  checkListOverlap(ignoreList, reservedList);
  const bindNodes = getFilteredBindNodes(xmlDoc, ignoreList);
  const bindNodePaths = bindNodes.map(node => node.getAttribute(XML_ATT_NODESET));
  validateReservedNodes(bindNodePaths, reservedList);
  validateErrorLength(bindNodePaths, errorLength);
  const warning = validateWarnLength(bindNodePaths, warnLength);

  return warning ? [ warning ] : [];
}

async function execute({ xmlDoc, propsData }) {
  const warnings = [];
  const errors = [];
  try {
    const fieldPathLinting = propsData.field_path_linting;
    if (!fieldPathLinting || Object.keys(fieldPathLinting).length === 0) {
      return { warnings, errors };
    }

    warnings.push(...validateFieldPaths(xmlDoc, fieldPathLinting));
  }
  catch (e) {
    errors.push(e.message);
  }

  return { warnings, errors };
}

module.exports = {
  requiresInstance: false,
  skipFurtherValidation: false,
  execute
};
