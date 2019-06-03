const log = require('./log');
const { trace } = log;

const { pluckIdsFromLineage } = require('./lineage-manipulation');

const lineageConstraints = async (db, parentDoc) => {
  let mapTypeToAllowedParents;
  try {
    const { settings } = await db.get('settings');
    const { contact_types } = settings;

    if (Array.isArray(contact_types)) {
      mapTypeToAllowedParents = contact_types
        .filter(rule => rule)
        .reduce((agg, curr) => Object.assign(agg, { [curr.id]: curr.parents }), {});
      trace('Found app_settings.contact_types. Configurable hierarchy constraints will be enforced.');
    }
  } catch (err) {
    if (err.name !== 'not_found') {
      throw err;
    }

    // passthrough with mapTypeToAllowedParents=undefined
  }

  return {
    getConfigurableHierarchyErrors: contactDoc => getConfigurableHierarchyViolations(mapTypeToAllowedParents, contactDoc, parentDoc),
    getPrimaryContactViolations: (contactDoc, descendantDocs) => getPrimaryContactViolations(db, contactDoc, parentDoc, descendantDocs),
  };
};

/*
Enforce the whitelist of allowed parents for each contact type as defined in settings.contact_types attribute
*/
const getConfigurableHierarchyViolations = (mapTypeToAllowedParents, contactDoc, parentDoc) => {
  const { type: contactType } = contactDoc;
  const { type: parentType } = parentDoc || {};
  if (!contactType) return 'contact required attribute "type" is undefined';
  if (parentDoc && !parentType) return 'parent required attribute "type" is undefined';

  if (!mapTypeToAllowedParents) {
    const allowedTypes = [ 'person', 'clinic', 'health_center', 'district_hospital'];
    let error;
    if (!allowedTypes.includes(contactType)) {
      error = `document with id '${contactDoc._id}' is not a contact and cannot be moved`;
    }

    if (parentDoc && !allowedTypes.includes(parentType)) {
      error = `parent document with id '${parentDoc._id}' is not a contact and cannot be moved`;
    }
    
    return error;
  }

  if (!mapTypeToAllowedParents[contactType]) return `contact_types does not define rules for type ${contactType}`;
  if (!mapTypeToAllowedParents[contactType].includes(parentType)) return `contact_types does not allow parent of type ${parentType} for contact of type ${contactType}`;
};

/*
A place's primary contact must be a descendant of that place.

1. Check to see which part of the contact's lineage will change.
2. For each removed part of the contact's lineage, confirm that place's primary contact isn't being removed.
*/
const getPrimaryContactViolations = async (db, contactDoc, parentDoc, descendantDocs) => {
  const safeGetLineageFromDoc = doc => doc ? pluckIdsFromLineage(doc.parent) : [];
  const contactsLineageIds = safeGetLineageFromDoc(contactDoc);
  const parentsLineageIds = safeGetLineageFromDoc(parentDoc);

  if (parentDoc) {
    parentsLineageIds.push(parentDoc._id);
  }

  const docsRemovedFromContactLineage = await Promise.all(contactsLineageIds.filter(value => !parentsLineageIds.includes(value)).map(id => db.get(id)));
  const primaryContactIds = docsRemovedFromContactLineage.map(place => place.contact && place.contact._id).filter(id => id);
  return descendantDocs.find(descendant => primaryContactIds.some(primaryId => descendant._id === primaryId));
};

module.exports = lineageConstraints;
