
/*
Given a doc, replace the lineage information therein with "replaceWith"

startingFromIdInLineage (optional) - Will result in a partial replacement of the lineage. Only the part of the lineage "after" the parent
with _id=startingFromIdInLineage will be replaced by "replaceWith"
*/
const replaceLineage = (doc, replaceWith, startingFromIdInLineage) => {
  const lineageAttributeName = doc.type === 'data_record' ? 'contact' : 'parent';
  const handleReplacement = (replaceInDoc, docAttr, replaceWith) => {
    if (!replaceWith) {
      const lineageWasDeleted = !!replaceInDoc[docAttr];
      replaceInDoc[docAttr] = undefined;
      return lineageWasDeleted;
    } else if (replaceInDoc[docAttr]) {
      replaceInDoc[docAttr]._id = replaceWith._id;
      replaceInDoc[docAttr].parent = replaceWith.parent;
    } else {
      replaceInDoc[docAttr] = replaceWith;
    }

    return true;
  };

  // Replace the full lineage
  if (!startingFromIdInLineage || doc._id === startingFromIdInLineage) {
    return handleReplacement(doc, lineageAttributeName, replaceWith);
  }

  // Replace part of a lineage
  let currentParent = doc[lineageAttributeName];
  do {
    if (currentParent._id === startingFromIdInLineage) {
      return handleReplacement(currentParent, 'parent', replaceWith);
    }
    currentParent = currentParent.parent;
  } while (currentParent);

  return false;
};


/*
Runs replaceLineage for an array of docs. Aggregates truthy results
*/
const replaceLineages = (docs, replacementLineage, startingFromIdInLineage) => docs.reduce((agg, doc) => {
  if (replaceLineage(doc, replacementLineage, startingFromIdInLineage)) {
    agg.push(doc);
  }
  return agg;
}, []);

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
  pluckIdsFromLineage,
  replaceLineages,
  replaceLineage,
};
