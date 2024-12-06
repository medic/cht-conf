
/**
 * Given a doc, replace the lineage information therein with "replaceWith"
 * 
 * @param {Object} doc A CouchDB document containing a hierarchy that needs replacing
 * @param {Object} params SonarQube
 * @param {string} params.lineageAttribute Name of the attribute which is a lineage in doc (contact or parent)
 * @param {Object} params.replaceWith The new hierarchy { parent: { _id: 'parent', parent: { _id: 'grandparent' } }
 * @param {string} params.startingFromId Only the part of the lineage "after" this id will be replaced
 * @param {boolean} params.merge When true, startingFromId is replaced and when false, startingFromId's parent is replaced 
 */
function replaceLineage(doc, params) {
  const { lineageAttribute, replaceWith, startingFromId, merge } = params;

  // Replace the full lineage
  if (!startingFromId) {
    return replaceWithinLineage(doc, lineageAttribute, replaceWith);
  }

  function getInitialState() {
    if (merge) {
      return {
        element: doc,
        attributeName: lineageAttribute,
      };
    }

    return {
      element: doc[lineageAttribute],
      attributeName: 'parent',
    };
  }

  function traverseOne() {
    const compare = merge ? state.element[state.attributeName] : state.element;
    if (compare?._id === startingFromId) {
      return replaceWithinLineage(state.element, state.attributeName, replaceWith);
    }

    state.element = state.element[state.attributeName];
    state.attributeName = 'parent';
  }

  const state = getInitialState();
  while (state.element) {
    const result = traverseOne();
    if (result) {
      return result;
    }
  }

  return false;
}

const replaceWithinLineage = (replaceInDoc, lineageAttributeName, replaceWith) => {
  if (!replaceWith) {
    const lineageWasDeleted = !!replaceInDoc[lineageAttributeName];
    replaceInDoc[lineageAttributeName] = undefined;
    return lineageWasDeleted;
  } else if (replaceInDoc[lineageAttributeName]) {
    replaceInDoc[lineageAttributeName]._id = replaceWith._id;
    replaceInDoc[lineageAttributeName].parent = replaceWith.parent;
  } else {
    replaceInDoc[lineageAttributeName] = replaceWith;
  }

  return true;
};

/*
Function borrowed from shared-lib/lineage
*/
const minifyLineagesInDoc = doc => {
  const minifyLineage = lineage => {
    if (!lineage?._id) {
      return;
    }

    return {
      _id: lineage._id,
      parent: minifyLineage(lineage.parent),
    };
  };

  if (!doc) {
    return;
  }
  
  if ('parent' in doc) {
    doc.parent = minifyLineage(doc.parent);
  }
  
  if ('contact' in doc) {
    doc.contact = minifyLineage(doc.contact);
  }

  if (doc.type === 'data_record') {
    delete doc.patient;
  }
};

const createLineageFromDoc = doc => {
  if (!doc) {
    return undefined;
  }

  return {
    _id: doc._id,
    parent: doc.parent || undefined,
  };
};

/*
Given a lineage, return the ids therein
*/
const pluckIdsFromLineage = lineage => {
  const result = [];

  let current = lineage;
  while (current) {
    result.push(current._id);
    current = current.parent;
  }

  return result;
};

module.exports = {
  createLineageFromDoc,
  minifyLineagesInDoc,
  pluckIdsFromLineage,
  replaceLineage,
};
