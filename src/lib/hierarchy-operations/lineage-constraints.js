const log = require('../log');
const { HIERARCHY_ROOT } = require('./hierarchy-data-source');
const { trace } = log;

const lineageManipulation = require('./lineage-manipulation');

module.exports = async (db, options) => {
  const contactTypeInfo = await fetchContactTypeInfo(db);

  return {
    assertNoPrimaryContactViolations: async (sourceDoc, destinationDoc, descendantDocs) => {
      const invalidPrimaryContactDoc = await getPrimaryContactViolations(db, sourceDoc, destinationDoc, descendantDocs);
      if (invalidPrimaryContactDoc) {
        throw Error(`Cannot remove contact '${invalidPrimaryContactDoc?.name}' (${invalidPrimaryContactDoc?._id}) from the hierarchy for which they are a primary contact.`);
      }
    },
    assertNoHierarchyErrors: (sourceDocs, destinationDoc) => {

      sourceDocs.forEach(sourceDoc => {
        const commonViolations = getCommonViolations(sourceDoc, destinationDoc);
        const specificViolation = options.merge ?
          getMergeViolations(sourceDoc, destinationDoc)
          : getMovingViolations(contactTypeInfo, sourceDoc, destinationDoc);

        const hierarchyError = commonViolations || specificViolation;
        if (hierarchyError) {
          throw Error(`Hierarchy Constraints: ${hierarchyError}`);
        }
      });
  
      /*
      It is nice that the tool can move lists of contacts as one operation, but strange things happen when two contactIds are in the same lineage.
      For example, moving a district_hospital and moving a contact under that district_hospital to a new clinic causes multiple colliding writes to the same json file.
      */
      const contactIds = sourceDocs.map(doc => doc._id);
      sourceDocs
        .forEach(doc => {
          const parentIdsOfDoc = lineageManipulation.pluckIdsFromLineage(doc.parent);
          const violatingParentId = parentIdsOfDoc.find(parentId => contactIds.includes(parentId));
          if (violatingParentId) {
            throw Error(`Unable to move two documents from the same lineage: '${doc._id}' and '${violatingParentId}'`);
          }
        });
    },

    isPlace: (contact) => {
      const contactType = getContactType(contact);
      return !contactTypeInfo[contactType]?.person;
    },
  };
};

/*
Enforce the list of allowed parents for each contact type
Ensure we are not creating a circular hierarchy
*/
const getMovingViolations = (mapTypeToAllowedParents, sourceDoc, destinationDoc) => {
  const contactTypeError = getMovingContactTypeError(mapTypeToAllowedParents, sourceDoc, destinationDoc);
  const circularHierarchyError = findCircularHierarchyErrors(sourceDoc, destinationDoc);
  return contactTypeError || circularHierarchyError;
};

function getMovingContactTypeError(contactTypeInfo, sourceDoc, destinationDoc) {
  const sourceContactType = getContactType(sourceDoc);
  const destinationType = getContactType(destinationDoc);
  const parentsForContactType = contactTypeInfo[sourceContactType]?.parents;
  if (!parentsForContactType) {
    return `cannot move contact with unknown type '${sourceContactType}'`;
  }

  const isPermittedMoveToRoot = !destinationDoc && parentsForContactType.length === 0;
  if (!isPermittedMoveToRoot && !parentsForContactType.includes(destinationType)) {
    return `contacts of type '${sourceContactType}' cannot have parent of type '${destinationType}'`;
  }
}

function findCircularHierarchyErrors(sourceDoc, destinationDoc) {
  if (!destinationDoc) {
    return;
  }

  const parentAncestry = lineageManipulation.pluckIdsFromLineage(destinationDoc);
  if (parentAncestry.includes(sourceDoc._id)) {
    return `Circular hierarchy: Cannot set parent of contact '${sourceDoc._id}' as it would create a circular hierarchy.`;
  }
}

const getCommonViolations = (sourceDoc, destinationDoc) => {
  if (!sourceDoc) {
    return `source doc cannot be found`;
  }

  const sourceContactType = getContactType(sourceDoc);
  const destinationContactType = getContactType(destinationDoc);
  if (!sourceContactType) {
    return `source contact "${sourceDoc._id}" required attribute "type" is undefined`;
  }

  if (destinationDoc && !destinationContactType) {
    return `destination contact "${destinationDoc._id}" required attribute "type" is undefined`;
  }

  if (sourceDoc._id === destinationDoc?._id) {
    return `cannot move or merge contact that is itself`;
  }
};

const getMergeViolations = (sourceDoc, destinationDoc) => {
  if (!destinationDoc) {
    return `destination doc cannot be found`;
  }

  if ([sourceDoc._id, destinationDoc._id].includes(HIERARCHY_ROOT)) {
    return `cannot merge using id: "${HIERARCHY_ROOT}"`;
  }

  const sourceContactType = getContactType(sourceDoc);
  const destinationContactType = getContactType(destinationDoc);
  if (sourceContactType !== destinationContactType) {
    return `source and destinations must have the same type. Source is "${sourceContactType}" while destination is "${destinationContactType}".`;
  }
};

/*
A place's primary contact must be a descendant of that place.

1. Check to see which part of the contact's lineage will be removed
2. For each removed part of the contact's lineage, confirm that place's primary contact isn't being removed.
*/
const getPrimaryContactViolations = async (db, contactDoc, destinationDoc, descendantDocs) => {
  const contactsLineageIds = lineageManipulation.pluckIdsFromLineage(contactDoc?.parent);
  const parentsLineageIds = lineageManipulation.pluckIdsFromLineage(destinationDoc);

  const docIdsRemovedFromContactLineage = contactsLineageIds.filter(value => !parentsLineageIds.includes(value));
  const docsRemovedFromContactLineage = await db.allDocs({
    keys: docIdsRemovedFromContactLineage,
    include_docs: true,
  });

  const primaryContactIds = docsRemovedFromContactLineage.rows
    .map(row => row?.doc?.contact?._id)
    .filter(Boolean);
  
  return descendantDocs.find(descendant => primaryContactIds.some(primaryId => descendant._id === primaryId));
};

const getContactType = doc => doc?.type === 'contact' ? doc?.contact_type : doc?.type;

async function fetchContactTypeInfo(db) {
  try {
    const { settings: { contact_types } } = await db.get('settings');

    if (Array.isArray(contact_types)) {
      trace('Found app_settings.contact_types. Configurable hierarchy constraints will be enforced.');
      const parentDict = {};
      contact_types
        .filter(Boolean)
        .forEach(({ id, person, parents }) => parentDict[id] = { parents, person: !!person });
      return parentDict;
    }
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
  }

  trace('Default hierarchy constraints will be enforced.');
  return {
    district_hospital: { parents: [] },
    health_center: { parents: ['district_hospital'] },
    clinic: { parents: ['health_center'] },
    person: { parents: ['district_hospital', 'health_center', 'clinic'], person: true },
  };
}

