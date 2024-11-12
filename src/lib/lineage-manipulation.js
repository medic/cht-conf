
/*
Given a doc, replace the lineage information therein with "replaceWith"

startingFromIdInLineage (optional) - Will result in a partial replacement of the lineage. Only the part of the lineage "after" the parent
with _id=startingFromIdInLineage will be replaced by "replaceWith"
*/
const replaceLineageAfter = (doc, lineageAttributeName, replaceWith, startingFromIdInLineage) => {
  // Replace the full lineage
  if (!startingFromIdInLineage) {
    return _doReplaceInLineage(doc, lineageAttributeName, replaceWith);
  }

  // Replace part of a lineage
  let currentParent = doc[lineageAttributeName];
  while (currentParent) {
    if (currentParent._id === startingFromIdInLineage) {
      return _doReplaceInLineage(currentParent, 'parent', replaceWith);
    }
    currentParent = currentParent.parent;
  }

  return false;
};

const replaceLineageAt = (doc, lineageAttributeName, replaceWith, startingFromIdInLineage) => {
  if (!replaceWith || !startingFromIdInLineage) {
    throw Error('replaceWith and startingFromIdInLineage must be defined');
  }

  // Replace part of a lineage
  let currentElement = doc;
  let currentAttributeName = lineageAttributeName;
  while (currentElement) {
    if (currentElement[currentAttributeName]?._id === startingFromIdInLineage) {
      return _doReplaceInLineage(currentElement, currentAttributeName, replaceWith);
    }

    currentElement = currentElement[currentAttributeName];
    currentAttributeName = 'parent';
  }

  return false;
};

const _doReplaceInLineage = (replaceInDoc, lineageAttributeName, replaceWith) => {
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
    if (!lineage || !lineage._id) {
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
    if (doc.contact && !doc.contact.parent) delete doc.contact.parent; // for unit test clarity
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
  replaceLineageAfter,
  replaceLineageAt,
};
