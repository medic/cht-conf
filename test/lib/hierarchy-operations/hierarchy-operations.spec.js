const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const rewire = require('rewire');
const sinon = require('sinon');

const { mockReport, mockHierarchy, parentsToLineage } = require('../../mock-hierarchies');
const JsDocs = rewire('../../../src/lib/hierarchy-operations/jsdocFolder');
const DataSource = rewire('../../../src/lib/hierarchy-operations/hierarchy-data-source');

const PouchDB = require('pouchdb-core');

chai.use(chaiAsPromised);
PouchDB.plugin(require('pouchdb-adapter-memory'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const { assert, expect } = chai;

const HierarchyOperations = rewire('../../../src/lib/hierarchy-operations');
const deleteHierarchy = rewire('../../../src/lib/hierarchy-operations/delete-hierarchy');

HierarchyOperations.__set__('JsDocs', JsDocs);
HierarchyOperations.__set__('DataSource', DataSource);
deleteHierarchy.__set__('JsDocs', JsDocs);
deleteHierarchy.__set__('DataSource', DataSource);
HierarchyOperations.__set__('deleteHierarchy', deleteHierarchy);

const contacts_by_depth = {
  // eslint-disable-next-line quotes
  map: "function(doc) {\n  if (doc.type === 'tombstone' && doc.tombstone) {\n    doc = doc.tombstone;\n  }\n  if (['contact', 'person', 'clinic', 'health_center', 'district_hospital'].indexOf(doc.type) !== -1) {\n    var value = doc.patient_id || doc.place_id;\n    var parent = doc;\n    var depth = 0;\n    while (parent) {\n      if (parent._id) {\n        emit([parent._id], value);\n        emit([parent._id, depth], value);\n      }\n      depth++;\n      parent = parent.parent;\n    }\n  }\n}",
};

const reports_by_freetext = {
  // eslint-disable-next-line quotes
  map: "function(doc) {\n  var skip = [ '_id', '_rev', 'type', 'refid', 'content' ];\n\n  var usedKeys = [];\n  var emitMaybe = function(key, value) {\n    if (usedKeys.indexOf(key) === -1 && // Not already used\n        key.length > 2 // Not too short\n    ) {\n      usedKeys.push(key);\n      emit([key], value);\n    }\n  };\n\n  var emitField = function(key, value, reportedDate) {\n    if (!key || !value) {\n      return;\n    }\n    key = key.toLowerCase();\n    if (skip.indexOf(key) !== -1 || /_date$/.test(key)) {\n      return;\n    }\n    if (typeof value === 'string') {\n      value = value.toLowerCase();\n      value.split(/\\s+/).forEach(function(word) {\n        emitMaybe(word, reportedDate);\n      });\n    }\n    if (typeof value === 'number' || typeof value === 'string') {\n      emitMaybe(key + ':' + value, reportedDate);\n    }\n  };\n\n  if (doc.type === 'data_record' && doc.form) {\n    Object.keys(doc).forEach(function(key) {\n      emitField(key, doc[key], doc.reported_date);\n    });\n    if (doc.fields) {\n      Object.keys(doc.fields).forEach(function(key) {\n        emitField(key, doc.fields[key], doc.reported_date);\n      });\n    }\n    if (doc.contact && doc.contact._id) {\n      emitMaybe('contact:' + doc.contact._id.toLowerCase(), doc.reported_date);\n    }\n  }\n}"
};

describe('hierarchy-operations', () => {
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

  const upsert = async (id, content) => {
    const { _rev } = await pouchDb.get(id);
    await pouchDb.put(Object.assign({
      _id: id,
      _rev,
    }, content));
  };
  const updateHierarchyRules = contact_types => upsert('settings', { settings: { contact_types } });

  beforeEach(async () => {
    pouchDb = new PouchDB(`hierarchy-operations-${scenarioCount++}`);

    await mockHierarchy(pouchDb, {
      district_1: {
        health_center_1: {
          clinic_1: {
            patient_1: {},
          },
        },
      },
      district_2: {
        health_center_2: {
          clinic_2: {
            patient_2: {},
          }
        }
      },
    });

    await pouchDb.put({ _id: 'settings', settings: {} });

    await mockReport(pouchDb, {
      id: 'report_1',
      creatorId: 'health_center_1_contact',
    });

    await pouchDb.put({
      _id: '_design/medic-client',
      views: { reports_by_freetext },
    });

    await pouchDb.put({
      _id: '_design/medic',
      views: { contacts_by_depth },
    });

    JsDocs.writeDoc = (docDirectoryPath, doc) => writtenDocs.push(doc);
    JsDocs.__set__('writeDoc', JsDocs.writeDoc);

    JsDocs.prepareFolder = () => {};
    writtenDocs.length = 0;
  });

  afterEach(async () => pouchDb.destroy());
  
  describe('move', () => {
    it('move health_center_1 to district_2', async () => {
      await HierarchyOperations(pouchDb).move(['health_center_1'], 'district_2');

      expect(getWrittenDoc('health_center_1_contact')).to.deep.eq({
        _id: 'health_center_1_contact',
        type: 'person',
        parent: parentsToLineage('health_center_1', 'district_2'),
      });

      expect(getWrittenDoc('health_center_1')).to.deep.eq({
        _id: 'health_center_1',
        type: 'health_center',
        contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_2'),
        parent: parentsToLineage('district_2'),
      });

      expect(getWrittenDoc('clinic_1')).to.deep.eq({
        _id: 'clinic_1',
        type: 'clinic',
        contact: parentsToLineage('clinic_1_contact', 'clinic_1', 'health_center_1', 'district_2'),
        parent: parentsToLineage('health_center_1', 'district_2'),
      });

      expect(getWrittenDoc('patient_1')).to.deep.eq({
        _id: 'patient_1',
        type: 'person',
        parent: parentsToLineage('clinic_1', 'health_center_1', 'district_2'),
      });

      expect(getWrittenDoc('report_1')).to.deep.eq({
        _id: 'report_1',
        form: 'foo',
        type: 'data_record',
        fields: {},
        contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_2'),
      });
    });

    it('move health_center_1 to root', async () => {
      sinon.spy(pouchDb, 'query');

      await updateHierarchyRules([{ id: 'health_center', parents: [] }]);

      await HierarchyOperations(pouchDb).move(['health_center_1'], 'root');

      expect(getWrittenDoc('health_center_1_contact')).to.deep.eq({
        _id: 'health_center_1_contact',
        type: 'person',
        parent: parentsToLineage('health_center_1'),
      });

      expect(getWrittenDoc('health_center_1')).to.deep.eq({
        _id: 'health_center_1',
        type: 'health_center',
        contact: parentsToLineage('health_center_1_contact', 'health_center_1'),
        parent: parentsToLineage(),
      });

      expect(getWrittenDoc('clinic_1')).to.deep.eq({
        _id: 'clinic_1',
        type: 'clinic',
        contact: parentsToLineage('clinic_1_contact', 'clinic_1', 'health_center_1'),
        parent: parentsToLineage('health_center_1'),
      });

      expect(getWrittenDoc('patient_1')).to.deep.eq({
        _id: 'patient_1',
        type: 'person',
        parent: parentsToLineage('clinic_1', 'health_center_1'),
      });

      expect(getWrittenDoc('report_1')).to.deep.eq({
        _id: 'report_1',
        form: 'foo',
        type: 'data_record',
        fields: {},
        contact: parentsToLineage('health_center_1_contact', 'health_center_1'),
      });

      const contactIdsKeys = [
        ['contact:clinic_1'],
        ['contact:clinic_1_contact'],
        ['contact:health_center_1'],
        ['contact:health_center_1_contact'],
        ['contact:patient_1']
      ];
      expect(pouchDb.query.callCount).to.equal(2);
      expect(pouchDb.query.args).to.deep.equal([
        ['medic/contacts_by_depth', { key: ['health_center_1'], include_docs: true, group_level: undefined, skip: undefined, limit: undefined }],
        ['medic-client/reports_by_freetext', { keys: contactIdsKeys, include_docs: true, limit: 10000, skip: 0, group_level: undefined }],
      ]);
    });

    it('move district_1 from root', async () => {
      await updateHierarchyRules([{ id: 'district_hospital', parents: ['district_hospital'] }]);

      await HierarchyOperations(pouchDb).move(['district_1'], 'district_2');

      expect(getWrittenDoc('district_1')).to.deep.eq({
        _id: 'district_1',
        type: 'district_hospital',
        contact: parentsToLineage('district_1_contact', 'district_1', 'district_2'),
        parent: parentsToLineage('district_2'),
      });

      expect(getWrittenDoc('health_center_1_contact')).to.deep.eq({
        _id: 'health_center_1_contact',
        type: 'person',
        parent: parentsToLineage('health_center_1', 'district_1', 'district_2'),
      });

      expect(getWrittenDoc('health_center_1')).to.deep.eq({
        _id: 'health_center_1',
        type: 'health_center',
        contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_1', 'district_2'),
        parent: parentsToLineage('district_1', 'district_2'),
      });

      expect(getWrittenDoc('clinic_1')).to.deep.eq({
        _id: 'clinic_1',
        type: 'clinic',
        contact: parentsToLineage('clinic_1_contact', 'clinic_1', 'health_center_1', 'district_1', 'district_2'),
        parent: parentsToLineage('health_center_1', 'district_1', 'district_2'),
      });

      expect(getWrittenDoc('patient_1')).to.deep.eq({
        _id: 'patient_1',
        type: 'person',
        parent: parentsToLineage('clinic_1', 'health_center_1', 'district_1', 'district_2'),
      });

      expect(getWrittenDoc('report_1')).to.deep.eq({
        _id: 'report_1',
        form: 'foo',
        type: 'data_record',
        fields: {},
        contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_1', 'district_2'),
      });
    });

    it('move district_1 to flexible hierarchy parent', async () => {
      await pouchDb.put({
        _id: `county_1`,
        type: 'contact',
        contact_type: 'county',
      });

      await updateHierarchyRules([
        { id: 'county', parents: [] },
        { id: 'district_hospital', parents: ['county'] },
      ]);

      await HierarchyOperations(pouchDb).move(['district_1'], 'county_1');

      expect(getWrittenDoc('health_center_1_contact')).to.deep.eq({
        _id: 'health_center_1_contact',
        type: 'person',
        parent: parentsToLineage('health_center_1', 'district_1', 'county_1'),
      });

      expect(getWrittenDoc('health_center_1')).to.deep.eq({
        _id: 'health_center_1',
        type: 'health_center',
        contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_1', 'county_1'),
        parent: parentsToLineage('district_1', 'county_1'),
      });

      expect(getWrittenDoc('clinic_1')).to.deep.eq({
        _id: 'clinic_1',
        type: 'clinic',
        contact: parentsToLineage('clinic_1_contact', 'clinic_1', 'health_center_1', 'district_1', 'county_1'),
        parent: parentsToLineage('health_center_1', 'district_1', 'county_1'),
      });

      expect(getWrittenDoc('patient_1')).to.deep.eq({
        _id: 'patient_1',
        type: 'person',
        parent: parentsToLineage('clinic_1', 'health_center_1', 'district_1', 'county_1'),
      });

      expect(getWrittenDoc('report_1')).to.deep.eq({
        _id: 'report_1',
        form: 'foo',
        type: 'data_record',
        fields: {},
        contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_1', 'county_1'),
      });
    });

    it('moves flexible hierarchy contact to flexible hierarchy parent', async () => {
      await updateHierarchyRules([
        { id: 'county', parents: [] },
        { id: 'subcounty', parents: ['county'] },
        { id: 'focal', parents: ['county', 'subcounty'], person: true }
      ]);

      await pouchDb.bulkDocs([
        { _id: `county`, type: 'contact', contact_type: 'county' },
        { _id: `subcounty`, type: 'contact', contact_type: 'subcounty', parent: { _id: 'county' } },
        { _id: `focal`, type: 'contact', contact_type: 'focal', parent: { _id: 'county' } },
      ]);

      await mockReport(pouchDb, {
        id: 'report_focal',
        creatorId: 'focal',
      });

      await HierarchyOperations(pouchDb).move(['focal'], 'subcounty');

      expect(getWrittenDoc('focal')).to.deep.eq({
        _id: 'focal',
        type: 'contact',
        contact_type: 'focal',
        parent: parentsToLineage('subcounty', 'county'),
      });

      expect(getWrittenDoc('report_focal')).to.deep.eq({
        _id: 'report_focal',
        form: 'foo',
        type: 'data_record',
        fields: {},
        contact: parentsToLineage('focal', 'subcounty', 'county'),
      });
    });

    it('moving primary contact updates parents', async () => {
      await mockHierarchy(pouchDb, {
        t_district_1: {
          t_health_center_1: {
            t_clinic_1: {
              t_patient_1: {},
            },
            t_clinic_2: {
              t_patient_2: {},
            }
          },
        },
      });

      const patient1Lineage = parentsToLineage('t_patient_1', 't_clinic_1', 't_health_center_1', 't_district_1');
      await upsert('t_health_center_1', {
        type: 'health_center',
        contact: patient1Lineage,
        parent: parentsToLineage('t_district_1'),
      });

      await upsert('t_district_1', {
        type: 'district_hospital',
        contact: patient1Lineage,
        parent: parentsToLineage(),
      });

      await HierarchyOperations(pouchDb).move(['t_patient_1'], 't_clinic_2');

      expect(getWrittenDoc('t_health_center_1')).to.deep.eq({
        _id: 't_health_center_1',
        type: 'health_center',
        contact: parentsToLineage('t_patient_1', 't_clinic_2', 't_health_center_1', 't_district_1'),
        parent: parentsToLineage('t_district_1'),
      });

      expect(getWrittenDoc('t_district_1')).to.deep.eq({
        _id: 't_district_1',
        type: 'district_hospital',
        contact: parentsToLineage('t_patient_1', 't_clinic_2', 't_health_center_1', 't_district_1'),
      });

      expectWrittenDocs(['t_patient_1', 't_district_1', 't_health_center_1']);
    });

    // We don't want lineage { id, parent: '' } to result from district_hospitals which have parent: ''
    it('district_hospital with empty string parent is not preserved', async () => {
      await upsert('district_2', { parent: '', type: 'district_hospital' });
      await HierarchyOperations(pouchDb).move(['health_center_1'], 'district_2');

      expect(getWrittenDoc('health_center_1')).to.deep.eq({
        _id: 'health_center_1',
        type: 'health_center',
        contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_2'),
        parent: parentsToLineage('district_2'),
      });
    });

    it('documents should be minified', async () => {
      await updateHierarchyRules([{ id: 'clinic', parents: ['district_hospital'] }]);
      const patient = {
        parent: parentsToLineage('clinic_1', 'health_center_1', 'district_1'),
        type: 'person',
        important: true,
      };
      const clinic = {
        parent: parentsToLineage('health_center_1', 'district_1'),
        type: 'clinic',
        important: true,
      };
      patient.parent.important = false;
      clinic.parent.parent.important = false;
  
      await upsert('clinic_1', clinic);
      await upsert('patient_1', patient);
  
      await HierarchyOperations(pouchDb).move(['clinic_1'], 'district_2');
  
      expect(getWrittenDoc('clinic_1')).to.deep.eq({
        _id: 'clinic_1',
        type: 'clinic',
        important: true,
        parent: parentsToLineage('district_2'),
      });
      expect(getWrittenDoc('patient_1')).to.deep.eq({
        _id: 'patient_1',
        type: 'person',
        important: true,
        parent: parentsToLineage('clinic_1', 'district_2'),
      });
    });
  
    it('cannot create circular hierarchy', async () => {
      // even if the hierarchy rules allow it
      await updateHierarchyRules([{ id: 'health_center', parents: ['clinic'] }]);
  
      try {
        await HierarchyOperations(pouchDb).move(['health_center_1'], 'clinic_1');
        assert.fail('should throw');
      } catch (err) {
        expect(err.message).to.include('circular');
      }
    });
  
    it('throw if parent does not exist', async () => {
      const actual = HierarchyOperations(pouchDb).move(['clinic_1'], 'dne_parent_id');
      await expect(actual).to.eventually.rejectedWith('could not be found');
    });
  
    it('throw when altering same lineage', async () => {
      const actual = HierarchyOperations(pouchDb).move(['patient_1', 'health_center_1'], 'district_2');
      await expect(actual).to.eventually.rejectedWith('same lineage');
    });
  
    it('throw if contact_id is not a contact', async () => {
      const actual = HierarchyOperations(pouchDb).move(['report_1'], 'clinic_1');
      await expect(actual).to.eventually.rejectedWith('unknown type');
    });
  
    it('throw if moving primary contact of parent', async () => {
      const actual = HierarchyOperations(pouchDb).move(['clinic_1_contact'], 'district_1');
      await expect(actual).to.eventually.rejectedWith('primary contact');
    });
  
    it('throw if setting parent to self', async () => {
      await updateHierarchyRules([{ id: 'clinic', parents: ['clinic'] }]);
      const actual = HierarchyOperations(pouchDb).move(['clinic_1'], 'clinic_1');
      await expect(actual).to.eventually.rejectedWith('circular');
    });
  
    it('throw when moving place to unconfigured parent', async () => {
      await updateHierarchyRules([{ id: 'district_hospital', parents: [] }]);
      const actual = HierarchyOperations(pouchDb).move(['district_1'], 'district_2');
      await expect(actual).to.eventually.rejectedWith('parent of type');
    });
  
    describe('batching works as expected', () => {
      const initialBatchSize = DataSource.BATCH_SIZE;
      beforeEach(async () => {
        await mockReport(pouchDb, {
          id: 'report_2',
          creatorId: 'health_center_1_contact',
        });
  
        await mockReport(pouchDb, {
          id: 'report_3',
          creatorId: 'health_center_1_contact',
        });
  
        await mockReport(pouchDb, {
          id: 'report_4',
          creatorId: 'health_center_1_contact',
        });
      });
  
      afterEach(() => {
        DataSource.BATCH_SIZE = initialBatchSize;
        DataSource.__set__('BATCH_SIZE', initialBatchSize);
      });
  
      it('move health_center_1 to district_2 in batches of 1', async () => {
        DataSource.__set__('BATCH_SIZE', 1);
        DataSource.BATCH_SIZE = 1;
        sinon.spy(pouchDb, 'query');
  
        await HierarchyOperations(pouchDb).move(['health_center_1'], 'district_2');
        
        expect(getWrittenDoc('health_center_1_contact')).to.deep.eq({
          _id: 'health_center_1_contact',
          type: 'person',
          parent: parentsToLineage('health_center_1', 'district_2'),
        });
  
        expect(getWrittenDoc('health_center_1')).to.deep.eq({
          _id: 'health_center_1',
          type: 'health_center',
          contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_2'),
          parent: parentsToLineage('district_2'),
        });
  
        expect(getWrittenDoc('clinic_1')).to.deep.eq({
          _id: 'clinic_1',
          type: 'clinic',
          contact: parentsToLineage('clinic_1_contact', 'clinic_1', 'health_center_1', 'district_2'),
          parent: parentsToLineage('health_center_1', 'district_2'),
        });
  
        expect(getWrittenDoc('patient_1')).to.deep.eq({
          _id: 'patient_1',
          type: 'person',
          parent: parentsToLineage('clinic_1', 'health_center_1', 'district_2'),
        });
  
        expect(getWrittenDoc('report_1')).to.deep.eq({
          _id: 'report_1',
          form: 'foo',
          type: 'data_record',
          fields: {},
          contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_2'),
        });
  
        expect(getWrittenDoc('report_2')).to.deep.eq({
          _id: 'report_2',
          form: 'foo',
          type: 'data_record',
          fields: {},
          contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_2'),
        });
  
        expect(getWrittenDoc('report_3')).to.deep.eq({
          _id: 'report_3',
          form: 'foo',
          type: 'data_record',
          fields: {},
          contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_2'),
        });
  
        expect(pouchDb.query.callCount).to.deep.equal(6);
  
        const contactIdsKeys = [
          ['contact:clinic_1'],
          ['contact:clinic_1_contact'],
          ['contact:health_center_1'],
          ['contact:health_center_1_contact'],
          ['contact:patient_1']
        ];
        expect(pouchDb.query.args).to.deep.equal([
          ['medic/contacts_by_depth', { key: ['health_center_1'], include_docs: true, group_level: undefined, skip: undefined, limit: undefined }],
          ['medic-client/reports_by_freetext', { keys: contactIdsKeys, include_docs: true, limit: 1, skip: 0, group_level: undefined }],
          ['medic-client/reports_by_freetext', { keys: contactIdsKeys, include_docs: true, limit: 1, skip: 1, group_level: undefined }],
          ['medic-client/reports_by_freetext', { keys: contactIdsKeys, include_docs: true, limit: 1, skip: 2, group_level: undefined }],
          ['medic-client/reports_by_freetext', { keys: contactIdsKeys, include_docs: true, limit: 1, skip: 3, group_level: undefined }],
          ['medic-client/reports_by_freetext', { keys: contactIdsKeys, include_docs: true, limit: 1, skip: 4, group_level: undefined }],
        ]);
      });
  
      it('should health_center_1 to district_1 in batches of 2', async () => {
        DataSource.__set__('BATCH_SIZE', 2);
        DataSource.BATCH_SIZE = 2;
        sinon.spy(pouchDb, 'query');
  
        await HierarchyOperations(pouchDb).move(['health_center_1'], 'district_1');
  
        expect(getWrittenDoc('health_center_1_contact')).to.deep.eq({
          _id: 'health_center_1_contact',
          type: 'person',
          parent: parentsToLineage('health_center_1', 'district_1'),
        });
  
        expect(getWrittenDoc('health_center_1')).to.deep.eq({
          _id: 'health_center_1',
          type: 'health_center',
          contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_1'),
          parent: parentsToLineage('district_1'),
        });
  
        expect(getWrittenDoc('clinic_1')).to.deep.eq({
          _id: 'clinic_1',
          type: 'clinic',
          contact: parentsToLineage('clinic_1_contact', 'clinic_1', 'health_center_1', 'district_1'),
          parent: parentsToLineage('health_center_1', 'district_1'),
        });
  
        expect(getWrittenDoc('patient_1')).to.deep.eq({
          _id: 'patient_1',
          type: 'person',
          parent: parentsToLineage('clinic_1', 'health_center_1', 'district_1'),
        });
  
        expect(getWrittenDoc('report_1')).to.deep.eq({
          _id: 'report_1',
          form: 'foo',
          type: 'data_record',
          fields: {},
          contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_1'),
        });
  
        expect(getWrittenDoc('report_2')).to.deep.eq({
          _id: 'report_2',
          form: 'foo',
          type: 'data_record',
          fields: {},
          contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_1'),
        });
  
        expect(getWrittenDoc('report_3')).to.deep.eq({
          _id: 'report_3',
          form: 'foo',
          type: 'data_record',
          fields: {},
          contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_1'),
        });
  
        expect(pouchDb.query.callCount).to.deep.equal(4);
  
        const contactIdsKeys = [
          ['contact:clinic_1'],
          ['contact:clinic_1_contact'],
          ['contact:health_center_1'],
          ['contact:health_center_1_contact'],
          ['contact:patient_1']
        ];
        expect(pouchDb.query.args).to.deep.equal([
          ['medic/contacts_by_depth', { key: ['health_center_1'], include_docs: true, group_level: undefined, skip: undefined, limit: undefined }],
          ['medic-client/reports_by_freetext', { keys: contactIdsKeys, include_docs: true, limit: 2, skip: 0, group_level: undefined }],
          ['medic-client/reports_by_freetext', { keys: contactIdsKeys, include_docs: true, limit: 2, skip: 2, group_level: undefined }],
          ['medic-client/reports_by_freetext', { keys: contactIdsKeys, include_docs: true, limit: 2, skip: 4, group_level: undefined }]
        ]);
      });
    });
  });

  describe('merge', () => {
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
      await HierarchyOperations(pouchDb).merge(['district_2'], 'district_1');
  
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
        disableUsers: true,
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
          parent: undefined,
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
      await HierarchyOperations(pouchDb).merge(['patient_2'], 'patient_1');
  
      await expectWrittenDocs(['patient_2', 'pat2']);
  
      expect(getWrittenDoc('patient_2')).to.deep.eq({
        _id: 'patient_2',
        _deleted: true,
        disableUsers: false,
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
  });

  describe('delete', () => {
    const expectDeleted = (id, disableUsers = false) => {
      expect(getWrittenDoc(id)).to.deep.eq({
        _id: id,
        _deleted: true,
        disableUsers,
      });
    };

    it('delete district_2', async () => {
      // setup
      await mockReport(pouchDb, {
        id: 'district_report',
        creatorId: 'health_center_2_contact',
        patientId: 'district_2'
      });
  
      await mockReport(pouchDb, {
        id: 'patient_report',
        creatorId: 'health_center_2_contact',
        patientId: 'patient_2'
      });
  
      // action 
      await HierarchyOperations(pouchDb).delete(['district_2']);
  
      // assert
      const deletedPlaces = [
        'district_2', 
        'health_center_2', 
        'clinic_2',
      ];
      const deletedNonPeople = [
        'district_2_contact', 
        'health_center_2_contact', 
        'clinic_2_contact',
        'patient_2',
        'district_report',
        'patient_report',
      ];
      expectWrittenDocs([...deletedPlaces, ...deletedNonPeople]);
      deletedPlaces.forEach(id => expectDeleted(id, true));
      deletedNonPeople.forEach(id => expectDeleted(id, false));
    });

    it('reports created by deleted contacts are not deleted', async () => {
      // setup
      await mockReport(pouchDb, {
        id: 'other_report',
        creatorId: 'health_center_2_contact',
        patientId: 'other'
      });
  
      // action 
      await HierarchyOperations(pouchDb).delete(['district_2']);

      const writtenIds = writtenDocs.map(doc => doc._id);
      expect(writtenIds).to.not.include(['other_report']);
    });
  });
});
