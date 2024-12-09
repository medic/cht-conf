const log = require('../log');
const { HIERARCHY_ROOT } = require('./hierarchy-data-source');
const { trace } = log;

const lineageManipulation = require('./lineage-manipulation');

module.exports = async (db, options) => {
  const mapTypeToAllowedParents = await fetchAllowedParents(db);

  return {
    assertNoPrimaryContactViolations: async (sourceDoc, destinationDoc, descendantDocs) => {
      const invalidPrimaryContactDoc = await getPrimaryContactViolations(db, sourceDoc, destinationDoc, descendantDocs);
      if (invalidPrimaryContactDoc) {
        throw Error(`Cannot remove contact '${invalidPrimaryContactDoc?.name}' (${invalidPrimaryContactDoc?._id}) from the hierarchy for which they are a primary contact.`);
      }
    },
    assertNoHierarchyErrors: (sourceDocs, destinationDoc) => {
      if (!Array.isArray(sourceDocs)) {
        sourceDocs = [sourceDocs];
      }

      sourceDocs.forEach(sourceDoc => {
        const hierarchyError = options.merge ?
          getMergeViolations(sourceDoc, destinationDoc)
          : getMovingViolations(mapTypeToAllowedParents, sourceDoc, destinationDoc);

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
    }    
  };
};

/*
Enforce the list of allowed parents for each contact type
Ensure we are not creating a circular hierarchy
*/
const getMovingViolations = (mapTypeToAllowedParents, sourceDoc, destinationDoc) => {
  const commonViolations = getCommonViolations(sourceDoc, destinationDoc);
  const contactTypeError = getMovingContactTypeError(mapTypeToAllowedParents, sourceDoc, destinationDoc);
  const circularHierarchyError = findCircularHierarchyErrors(sourceDoc, destinationDoc);
  return commonViolations || contactTypeError || circularHierarchyError;
};

function getMovingContactTypeError(mapTypeToAllowedParents, sourceDoc, destinationDoc) {
  const sourceContactType = getContactType(sourceDoc);
  const destinationType = getContactType(destinationDoc);
  const rulesForContact = mapTypeToAllowedParents[sourceContactType];
  if (!rulesForContact) {
    return `cannot move contact with unknown type '${sourceContactType}'`;
  }

  const isPermittedMoveToRoot = !destinationDoc && rulesForContact.length === 0;
  if (!isPermittedMoveToRoot && !rulesForContact.includes(destinationType)) {
    return `contacts of type '${sourceContactType}' cannot have parent of type '${destinationType}'`;
  }
}

function findCircularHierarchyErrors(sourceDoc, destinationDoc) {
  if (!destinationDoc || !sourceDoc._id) {
    return;
  }

  const parentAncestry = [destinationDoc._id, ...lineageManipulation.pluckIdsFromLineage(destinationDoc.parent)];
  if (parentAncestry.includes(sourceDoc._id)) {
    return `Circular hierarchy: Cannot set parent of contact '${sourceDoc._id}' as it would create a circular hierarchy.`;
  }
}

const getCommonViolations = (sourceDoc, destinationDoc) => {
  const sourceContactType = getContactType(sourceDoc);
  const destinationContactType = getContactType(destinationDoc);
  if (!sourceContactType) {
    return `source contact "${sourceDoc._id}" required attribute "type" is undefined`;
  }

  if (destinationDoc && !destinationContactType) {
    return `destination contact "${destinationDoc._id}" required attribute "type" is undefined`;
  }
};

const getMergeViolations = (sourceDoc, destinationDoc) => {
  const commonViolations = getCommonViolations(sourceDoc, destinationDoc);
  if (commonViolations) {
    return commonViolations;
  }

  if ([sourceDoc._id, destinationDoc._id].includes(HIERARCHY_ROOT)) {
    return `cannot merge using id: "${HIERARCHY_ROOT}"`;
  }

  const sourceContactType = getContactType(sourceDoc);
  const destinationContactType = getContactType(destinationDoc);
  if (sourceContactType !== destinationContactType) {
    return `source and destinations must have the same type. Source is "${sourceContactType}" while destination is "${destinationContactType}".`;
  }

  if (sourceDoc._id === destinationDoc._id) {
    return `cannot move contact to destination that is itself`;
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

const getContactType = doc => doc && (doc.type === 'contact' ? doc.contact_type : doc.type);

async function fetchAllowedParents(db) {
  try {
    const { settings: { contact_types } } = await db.get('settings');

    if (Array.isArray(contact_types)) {
      trace('Found app_settings.contact_types. Configurable hierarchy constraints will be enforced.');
      const parentDict = {};
      contact_types
        .filter(Boolean)
        .forEach(({ id, parents }) => parentDict[id] = parents);
      return parentDict;
    }
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
  }

  trace('Default hierarchy constraints will be enforced.');
  return {
    district_hospital: [],
    health_center: ['district_hospital'],
    clinic: ['health_center'],
    person: ['district_hospital', 'health_center', 'clinic'],
  };
}

