
/**
 * Given a doc, replace the lineage information therein with "replaceWith"
 * 
 * @param {Object} doc A CouchDB document containing a hierarchy that needs replacing
 * @param {string} lineageAttributeName Name of the attribute which is a lineage in doc (contact or parent)
 * @param {Object} replaceWith The new hierarchy { parent: { _id: 'parent', parent: { _id: 'grandparent' } }
 * @param {string} [startingFromIdInLineage] Only the part of the lineage "after" this id will be replaced
 * @param {Object} options
 * @param {boolean} merge When true, startingFromIdInLineage is replaced and when false, startingFromIdInLineage's parent is replaced 
 */
function replaceLineage(doc, lineageAttributeName, replaceWith, startingFromIdInLineage, options={}) {
  // Replace the full lineage
  if (!startingFromIdInLineage) {
    return replaceWithinLineage(doc, lineageAttributeName, replaceWith);
  }

  const getInitialState = () => {
    if (options.merge) {
      return {
        element: doc,
        attributeName: lineageAttributeName,
      };
    }

    return {
      element: doc[lineageAttributeName],
      attributeName: 'parent',
    };
  };

  const state = getInitialState();
  while (state.element) {
    const compare = options.merge ? state.element[state.attributeName] : state.element;
    if (compare?._id === startingFromIdInLineage) {
      return replaceWithinLineage(state.element, state.attributeName, replaceWith);
    }

    state.element = state.element[state.attributeName];
    state.attributeName = 'parent';
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
      return undefined;
    }

    const result = {
      _id: lineage._id,
      parent: minifyLineage(lineage.parent),
    };

    return result;
  };

  if (!doc) {
    return undefined;
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
