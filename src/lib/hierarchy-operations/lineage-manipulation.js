const { replaceContactLineage, replaceParentLineage } = require('./replace-lineage');

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
const pluckIdsFromLineage = (lineage, results = []) => {
  if (!lineage) {
    return results;
  }

  return pluckIdsFromLineage(lineage.parent, [...results, lineage._id]);
};

module.exports = {
  createLineageFromDoc,
  minifyLineagesInDoc,
  pluckIdsFromLineage,
  replaceParentLineage,
  replaceContactLineage,
};
