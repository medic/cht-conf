const buildLineage = (id, parent) => ({ _id: id, parent });

const parentsToLineage = (...parentIds) => parentIds.reverse().reduce((arr, parentId) => ({
  _id: parentId,
  parent: arr,
}), undefined);

const mockHierarchy = async (db, hierarchy, existingLineage, depth = 0) => {
  const contactTypeByDepth = ['district_hospital', 'health_center', 'clinic', 'person'];
  const nextLineage = id => buildLineage(id, existingLineage);
  for (const contactId of Object.keys(hierarchy)) {
    const contactDoc = {
      _id: contactId,
      parent: existingLineage,
      type: contactTypeByDepth[depth],
    };

    if (depth < 3) {
      await db.put({
        _id: `${contactId}_contact`,
        type: 'person',
        parent: nextLineage(contactId),
      });
      
      contactDoc.contact = {
        _id: `${contactId}_contact`,
        parent: nextLineage(contactId),
      };
    }

    await db.put(contactDoc);

    await mockHierarchy(db, hierarchy[contactId], nextLineage(contactId), depth + 1);
  }
};

const mockReport = async (db, report) => {
  const creatorDoc = report.creatorId && await db.get(report.creatorId);
  const reportDoc = {
    _id: report.id,
    form: 'foo',
    type: 'data_record',
    contact: buildLineage(report.creatorId || 'dne', creatorDoc?.parent),
    fields: {
      patient_uuid: report.patientId,
    },
    ...report,
  };

  delete reportDoc.id;
  delete reportDoc.creatorId;
  delete reportDoc.patientId;

  await db.put(reportDoc);
};

module.exports = {
  mockReport,
  mockHierarchy,
  parentsToLineage,
};
