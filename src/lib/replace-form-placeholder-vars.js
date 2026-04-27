const Joi = require('joi');
// Dangerous to allow for just any string replacement, can result in wide variety of unexpected behaviour.
// So, a standard should be enforced to avoid such accidents by using a explicate replacement indicator.
const PLACEHOLDER_KEY = '__cht_var-';
// And, requiring all placeholder vars to follow the existing placeholder var syntax (PLACE_TYPE, PLACE_NAME): 
// - only uppercase letters
// - numbers, and
// - underscores
const VALID_KEY_REGEX = /^[A-Z0-9_]+$/;
// The var list in the .properties.json does not need the prefix.
const schema = Joi.object().pattern(
  Joi.string()
    .pattern(VALID_KEY_REGEX)
    .invalid(Joi.string().pattern(new RegExp(`^${PLACEHOLDER_KEY}`)))
    .required(),
  Joi.string().required()
);
// The "placeholder_vars" value has to be an object ("{}") with:
// - key - representing the placeholder reference/key that needs replacing, and
// - value - representing the value that should be used in that space instead

function formatFeedbackMsg(title, items, footer){
  return `${title}\n${items.join('\n')}\n${footer}`;
}

function validate(config){
  if(config === null || config === undefined){
    return;
  }

  const { error } = schema.validate(config, { abortEarly: false });
  if(error){

    throw new Error(formatFeedbackMsg(
      'The following placeholder vars do not follow the required syntax:',
      error.details.flatMap(({message}) =>  message),
      'Vars only consist of uppercase letters, numbers and underscores ("_")'
    ));
  }
}

function buildBaseObj(type, templateConfig){
  if(!type){
    return {};
  }

  const config = templateConfig?.[type];
  return {
    // Original placeholder replacement
    PLACE_TYPE: type,
    PLACE_NAME: typeof config === 'string' ? config : '',
    // New templates & forms will use the updated CONTACT_TYPE placeholder
    CONTACT_TYPE: type,
    CONTACT_NAME: config?.name ?? ''
  };
}

function processUserPlaceholderVars(dynamicReplacementVars){
  const obj = {};
  for(const [key, value] of Object.entries(dynamicReplacementVars ?? {})){
    obj[`${PLACEHOLDER_KEY}${key}`] = value;
  }

  return obj;
}

function replacePlaceholders(xml, obj){
  const keys = Object.keys(obj);
  if(keys.length){
    const regex = new RegExp(keys.join('|'), 'g');
    xml = xml.replace(regex, (matched) => obj[matched]);
  }
  return xml;
}

function checkForStragglers(xml){
  const remaining = xml.match(new RegExp(`${PLACEHOLDER_KEY}[A-Za-z0-9_]+`, 'g')) ?? [];
  if(remaining.length){
    throw new Error(formatFeedbackMsg(
      'The following placeholder vars were NOT replaced:',
      remaining,
      'Please make sure that the key & value for the above are listed in the .properties file'
    ));
  }
}

function replaceFormPlaceholderVars(xml, type, templateConfig, dynamicReplacementVars){
  validate(dynamicReplacementVars);
  const obj = {
    ...buildBaseObj(type, templateConfig), 
    ...processUserPlaceholderVars(dynamicReplacementVars)
  };
  xml = replacePlaceholders(xml, obj);
  checkForStragglers(xml);
  return xml;
}

module.exports = {
  replaceFormPlaceholderVars
};
