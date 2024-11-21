
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const rewire = require('rewire');

const Shared = rewire('../../../src/lib/move-contacts/mm-shared');

chai.use(chaiAsPromised);
const { expect } = chai;

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const MoveContactsLib = rewire('../../../src/lib/move-contacts/move-contacts-lib');
MoveContactsLib.__set__('Shared', Shared);

const move = MoveContactsLib({ merge: true }).move;

const { mockReport, mockHierarchy, parentsToLineage } = require('../../mock-hierarchies');

const contacts_by_depth = {
  // eslint-disable-next-line quotes
  map: "function(doc) {\n  if (doc.type === 'tombstone' && doc.tombstone) {\n    doc = doc.tombstone;\n  }\n  if (['contact', 'person', 'clinic', 'health_center', 'district_hospital'].indexOf(doc.type) !== -1) {\n    var value = doc.patient_id || doc.place_id;\n    var parent = doc;\n    var depth = 0;\n    while (parent) {\n      if (parent._id) {\n        emit([parent._id], value);\n        emit([parent._id, depth], value);\n      }\n      depth++;\n      parent = parent.parent;\n    }\n  }\n}",
};

const reports_by_freetext = {
  // eslint-disable-next-line quotes
  map: "function(doc) {\n  var skip = [ '_id', '_rev', 'type', 'refid', 'content' ];\n\n  var usedKeys = [];\n  var emitMaybe = function(key, value) {\n    if (usedKeys.indexOf(key) === -1 && // Not already used\n        key.length > 2 // Not too short\n    ) {\n      usedKeys.push(key);\n      emit([key], value);\n    }\n  };\n\n  var emitField = function(key, value, reportedDate) {\n    if (!key || !value) {\n      return;\n    }\n    key = key.toLowerCase();\n    if (skip.indexOf(key) !== -1 || /_date$/.test(key)) {\n      return;\n    }\n    if (typeof value === 'string') {\n      value = value.toLowerCase();\n      value.split(/\\s+/).forEach(function(word) {\n        emitMaybe(word, reportedDate);\n      });\n    }\n    if (typeof value === 'number' || typeof value === 'string') {\n      emitMaybe(key + ':' + value, reportedDate);\n    }\n  };\n\n  if (doc.type === 'data_record' && doc.form) {\n    Object.keys(doc).forEach(function(key) {\n      emitField(key, doc[key], doc.reported_date);\n    });\n    if (doc.fields) {\n      Object.keys(doc.fields).forEach(function(key) {\n        emitField(key, doc.fields[key], doc.reported_date);\n      });\n    }\n    if (doc.contact && doc.contact._id) {\n      emitMaybe('contact:' + doc.contact._id.toLowerCase(), doc.reported_date);\n    }\n  }\n}"
};

describe('merge-contacts', () => {
  let pouchDb, scenarioCount = 0;
  const writtenDocs = [];
  const getWrittenDoc = docId => {
    const matches = writtenDocs.filter(doc => doc && doc._id === docId);
    if (matches.length === 0) {
      return undefined;
    }

    // Remove _rev because it makes expectations harder to write
    const result = matches[matches.length - 1];
    delete result._rev;
    return result;
  };
  const expectWrittenDocs = expected => expect(writtenDocs.map(doc => doc._id)).to.have.members(expected);

  beforeEach(async () => {
    pouchDb = new PouchDB(`merge-contacts-${scenarioCount++}`);

    await mockHierarchy(pouchDb, {
      district_1: {
        health_center_1: {
          clinic_1: {
            patient_1: {},
          },
        }
      },
      district_2: {
        health_center_2: {
          clinic_2: {
            patient_2: {},
          },
        }
      },
    });

    await pouchDb.put({ _id: 'settings', settings: {} });

    await pouchDb.put({
      _id: '_design/medic-client',
      views: { reports_by_freetext },
    });

    await pouchDb.put({
      _id: '_design/medic',
      views: { contacts_by_depth },
    });

    Shared.writeDocumentToDisk = (docDirectoryPath, doc) => writtenDocs.push(doc);
    Shared.prepareDocumentDirectory = () => {};
    writtenDocs.length = 0;
  });

  afterEach(async () => pouchDb.destroy());

  it('merge district_2 into district_1', async () => {
    // setup
    await mockReport(pouchDb, {
      id: 'changing_subject_and_contact',
      creatorId: 'health_center_2_contact',
      patientId: 'district_2'
    });

    await mockReport(pouchDb, {
      id: 'changing_contact',
      creatorId: 'health_center_2_contact',
      patientId: 'patient_2'
    });

    await mockReport(pouchDb, {
      id: 'changing_subject',
      patientId: 'district_2'
    });

    // action 
    await move(['district_2'], 'district_1', pouchDb);

    // assert
    expectWrittenDocs([
      'district_2', 'district_2_contact', 
      'health_center_2', 'health_center_2_contact', 
      'clinic_2', 'clinic_2_contact',
      'patient_2',
      'changing_subject_and_contact', 'changing_contact', 'changing_subject'
    ]);

    expect(getWrittenDoc('district_2')).to.deep.eq({
      _id: 'district_2',
      _deleted: true,
    });

    expect(getWrittenDoc('health_center_2')).to.deep.eq({
      _id: 'health_center_2',
      type: 'health_center',
      contact: parentsToLineage('health_center_2_contact', 'health_center_2', 'district_1'),
      parent: parentsToLineage('district_1'),
    });

    expect(getWrittenDoc('clinic_2')).to.deep.eq({
      _id: 'clinic_2',
      type: 'clinic',
      contact: parentsToLineage('clinic_2_contact', 'clinic_2', 'health_center_2', 'district_1'),
      parent: parentsToLineage('health_center_2', 'district_1'),
    });

    expect(getWrittenDoc('patient_2')).to.deep.eq({
      _id: 'patient_2',
      type: 'person',
      parent: parentsToLineage('clinic_2', 'health_center_2', 'district_1'),
    });

    expect(getWrittenDoc('changing_subject_and_contact')).to.deep.eq({
      _id: 'changing_subject_and_contact',
      form: 'foo',
      type: 'data_record',
      contact: parentsToLineage('health_center_2_contact', 'health_center_2', 'district_1'),
      fields: {
        patient_uuid: 'district_1'
      }
    });

    expect(getWrittenDoc('changing_contact')).to.deep.eq({
      _id: 'changing_contact',
      form: 'foo',
      type: 'data_record',
      contact: parentsToLineage('health_center_2_contact', 'health_center_2', 'district_1'),
      fields: {
        patient_uuid: 'patient_2'
      }
    });

    expect(getWrittenDoc('changing_subject')).to.deep.eq({
      _id: 'changing_subject',
      form: 'foo',
      type: 'data_record',
      contact: { 
        _id: 'dne',
      },
      fields: {
        patient_uuid: 'district_1'
      }
    });
  });

  it('merge two patients', async () => {
    // setup
    await mockReport(pouchDb, {
      id: 'pat1',
      creatorId: 'clinic_1_contact',
      patientId: 'patient_1'
    });

    await mockReport(pouchDb, {
      id: 'pat2',
      creatorId: 'clinic_2_contact',
      patientId: 'patient_2'
    });

    // action
    await move(['patient_2'], 'patient_1', pouchDb);

    await expectWrittenDocs(['patient_2', 'pat2']);

    expect(getWrittenDoc('patient_2')).to.deep.eq({
      _id: 'patient_2',
      _deleted: true,
    });

    expect(getWrittenDoc('pat2')).to.deep.eq({
      _id: 'pat2',
      form: 'foo',
      type: 'data_record',
      // still created by the user in district-2
      contact: parentsToLineage('clinic_2_contact', 'clinic_2', 'health_center_2', 'district_2'),
      fields: {
        patient_uuid: 'patient_1'
      }
    });
  });

  xit('write to ancestors', () => {});

  it('throw if removed does not exist', async () => {
    const actual = move(['dne'], 'district_1', pouchDb);
    await expect(actual).to.eventually.rejectedWith('could not be found');
  });

  it('throw if kept does not exist', async () => {
    const actual = move(['district_1'], 'dne', pouchDb);
    await expect(actual).to.eventually.rejectedWith('could not be found');
  });

  it('throw if removed is kept', async () => {
    const actual = move(['district_1', 'district_2'], 'district_2', pouchDb);
    await expect(actual).to.eventually.rejectedWith('merge contact with self');
  });
});
