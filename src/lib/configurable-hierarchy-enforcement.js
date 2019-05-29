const log = require('./log');
const { trace } = log;

const configurableHierarchyEnforcement = async db => {
  const { settings } = (await db.get('settings'));
  const { contact_types } = settings;
  
  let allowedList;
  if (Array.isArray(contact_types)) {
    allowedList = contact_types
      .filter(rule => rule)
      .reduce((agg, curr) => Object.assign(agg, { [curr.id]: curr.parents }), {});
    trace('Found app_settings.contact_types. Configurable hierarchy constraints will be enforced.');
  }

  return (contactDoc, parentDoc) => enforceRules(allowedList, contactDoc, parentDoc);
};

const enforceRules = (allowedList, contactDoc, parentDoc) => {
  if (!allowedList) return;
  
  const { type: contactType } = contactDoc;
  const { type: parentType } = parentDoc;
  if (!contactType) return 'Contact required attribute "type" is undefined';
  if (parentDoc && !parentType) return 'Parent required attribute "type" is undefined';

  if (!allowedList[contactType]) return `Configurable hierarchy contact_types does not define rules for type ${contactType}`;
  if (!allowedList[contactType].includes(parentType)) return `Configurable hierarchy contact_types does not allow parent of type ${parentType} for contact of type ${contactType}`;
};

module.exports = configurableHierarchyEnforcement;
