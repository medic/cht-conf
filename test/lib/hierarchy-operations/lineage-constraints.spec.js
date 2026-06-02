const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
PouchDB.plugin(require('pouchdb-mapreduce'));
const rewire = require('rewire');

const { expect } = require('chai');
const sinon = require('sinon');

const { mockHierarchy } = require('../../mock-hierarchies');

const lineageConstraints = rewire('../../../src/lib/hierarchy-operations/lineage-constraints');
const log = require('../../../src/lib/log');
log.level = log.LEVEL_INFO;

describe('lineage constriants', () => {
  describe('assertNoHierarchyErrors', () => {
    it('empty rules yields error', async () => await expect(runScenario([], 'person', 'health_center'))
      .to.eventually.rejectedWith('unknown type'));

    it('no valid parent yields error', async () => await expect(runScenario([undefined], 'person', 'health_center'))
      .to.eventually.rejectedWith('unknown type'));

    it('valid parent yields no error', async () => {
      const actual = runScenario([{
        id: 'person',
        parents: ['health_center'],
      }], 'person', 'health_center');

      await expect(actual).to.eventually.equal(undefined);
    });

    it('no contact type yields undefined error', async () => expect(runScenario([]))
      .to.eventually.rejectedWith('undefined'));

    it('no parent type yields undefined error', async () => expect(runScenario([], 'person'))
      .to.eventually.rejectedWith('undefined'));

    it('no valid parents yields not defined', async () => expect(runScenario([{
      id: 'person',
      parents: ['district_hospital'],
    }], 'person', 'health_center')).to.eventually.rejectedWith('cannot have parent of type'));

    it('no settings doc requires valid parent type', async () => {
      const mockDb = { get: () => { throw { status: 404 }; } };
      const { assertNoHierarchyErrors } = await lineageConstraints(mockDb, { merge: false });
      const actual = () => assertNoHierarchyErrors([{ _id: 'a', type: 'person' }], { _id: 'b', type: 'dne' });
      expect(actual).to.throw('cannot have parent of type');
    });

    it('no settings doc requires valid contact type', async () => {
      const mockDb = { get: () => { throw { status: 404 }; } };
      const { assertNoHierarchyErrors } = await lineageConstraints(mockDb, { merge: false });
      const actual = () => assertNoHierarchyErrors([{ _id: 'a', type: 'dne' }], { _id: 'b', type: 'clinic' });
      expect(actual).to.throw('unknown type');
    });

    it('no settings doc yields not defined', async () => {
      const mockDb = { get: () => { throw { status: 404 }; } };
      const { assertNoHierarchyErrors } = await lineageConstraints(mockDb, { merge: false });
      const actual = assertNoHierarchyErrors([{ _id: 'a', type: 'person' }], { _id: 'b', type: 'clinic' });
      expect(actual).to.be.undefined;
    });

    it('cannot merge with self', async () => {
      const mockDb = { get: () => ({ settings: { contact_types: [] } }) };
      const { assertNoHierarchyErrors } = await lineageConstraints(mockDb, { merge: true });
      const actual = () => assertNoHierarchyErrors([{ _id: 'a', type: 'a' }], { _id: 'a', type: 'a' });
      expect(actual).to.throw('self');
    });

    it('cannot merge with id: "root"', async () => {
      const mockDb = { get: () => ({ settings: { contact_types: [] } }) };
      const { assertNoHierarchyErrors } = await lineageConstraints(mockDb, { merge: true });
      const actual = () => assertNoHierarchyErrors([{ _id: 'root', type: 'dne' }], { _id: 'foo', type: 'clinic' });
      expect(actual).to.throw('root');
    });

    it('cannot merge different types', async () => {
      const sourceType = 'person';
      const destinationType = 'health_center';
      const actual = runScenario([{
        id: 'person',
        parents: ['health_center'],
      }], sourceType, destinationType, true);

      await expect(actual).to.eventually.rejectedWith(
        `source and destinations must have the same type. `
        + `Source is "${sourceType}" while destination is "${destinationType}".`
      );
    });

    describe('default schema', () => {
      it('no defined rules enforces defaults schema', async () => await expect(runScenario(
        undefined,
        'district_hospital',
        'health_center'
      )).to.eventually.rejectedWith('cannot have parent'));
      
      it('nominal case', async () => expect(await runScenario(undefined, 'person', 'health_center')).to.be.undefined);

      it('can move district_hospital to root', async () => {
        const mockDb = { get: () => ({ settings: { } }) };
        const { assertNoHierarchyErrors } = await lineageConstraints(mockDb, { merge: false });
        const actual = assertNoHierarchyErrors([{ _id: 'a', type: 'district_hospital' }], undefined);
        expect(actual).to.be.undefined;
      });
    });
  });

  describe('assertOnPrimaryContactRemoval', () => {
    const assertOnPrimaryContactRemoval = lineageConstraints.__get__('assertOnPrimaryContactRemoval');

    describe('on memory pouchdb', async () => {
      let pouchDb;
      let scenarioCount = 0;
      beforeEach(async () => {
        pouchDb = new PouchDB(`lineage${scenarioCount++}`, { adapter: 'memory' });

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
              },
            },
          },
        });
      });
      afterEach(async () => pouchDb.destroy());

      it('cannot move clinic_1_contact to clinic_2', async () => {
        const contactDoc = await pouchDb.get('clinic_1_contact');
        const parentDoc = await pouchDb.get('clinic_2');

        const actual = assertOnPrimaryContactRemoval(pouchDb, contactDoc, parentDoc, [contactDoc]);
        await expect(actual).to.eventually.be.rejectedWith(`clinic_1_contact) from the hierarchy`);
      });

      it('cannot move clinic_1_contact to root', async () => {
        const contactDoc = await pouchDb.get('clinic_1_contact');
        const actual = assertOnPrimaryContactRemoval(pouchDb, contactDoc, undefined, [contactDoc]);
        await expect(actual).to.eventually.be.rejectedWith(`clinic_1_contact) from the hierarchy`);
      });

      it('can move clinic_1_contact to clinic_1', async () => {
        const contactDoc = await pouchDb.get('clinic_1_contact');
        const parentDoc = await pouchDb.get('clinic_1');

        const doc = await assertOnPrimaryContactRemoval(pouchDb, contactDoc, parentDoc, [contactDoc]);
        expect(doc).to.be.undefined;
      });

      it('can move health_center_2 to district_1', async () => {
        const contactDoc = await pouchDb.get('health_center_2');
        const parentDoc = await pouchDb.get('district_1');

        const descendants = await Promise.all([
          'health_center_2_contact', 'clinic_2', 'clinic_2_contact', 'patient_2'
        ].map(id => pouchDb.get(id)));
        const doc = await assertOnPrimaryContactRemoval(pouchDb, contactDoc, parentDoc, descendants);
        expect(doc).to.be.undefined;
      });

      it('when district_1 contact is patient_1. cannot move health_center_1 to district_2', async () => {
        const district1 = await pouchDb.get('district_1');
        district1.contact._id = 'patient_1';
        await pouchDb.put(district1);

        const contactDoc = await pouchDb.get('health_center_1');
        const parentDoc = await pouchDb.get('district_2');

        const descendants = await Promise.all([
          'health_center_1_contact', 'clinic_1', 'clinic_1_contact', 'patient_1'
        ].map(id => pouchDb.get(id)));
        const actual = assertOnPrimaryContactRemoval(pouchDb, contactDoc, parentDoc, descendants);
        await expect(actual).to.eventually.be.rejectedWith(`patient_1) from the hierarchy`);
      });

      // It is possible that one or more parents will not be found. Since these parents are being removed, do not throw
      it('no error if parent dne', async () => {
        const contactDoc = await pouchDb.get('clinic_1_contact');
        const parentDoc = await pouchDb.get('clinic_2');

        contactDoc.parent._id = 'dne';

        const doc = await assertOnPrimaryContactRemoval(pouchDb, contactDoc, parentDoc, [contactDoc]);
        expect(doc).to.be.undefined;
      });
    });
  });

  describe('assertSourcePrimaryContactType', () => {
    const assertSourcePrimaryContactType = lineageConstraints.__get__('assertSourcePrimaryContactType');

    it('no error when sourceDoc has no primary contact', async () => {
      const mockDb = { get: sinon.stub() };
      const sourceDoc = { _id: 'place_1', type: 'health_center' };
      await assertSourcePrimaryContactType(mockDb, {}, sourceDoc);
      expect(mockDb.get.called).to.be.false;
    });

    it('no error when primary contact doc is deleted (404)', async () => {
      const warnStub = sinon.stub(log, 'warn');
      const deletedErr = Object.assign(new Error('deleted'), { status: 404 });
      const mockDb = { get: sinon.stub().rejects(deletedErr) };
      const sourceDoc = { _id: 'place_1', type: 'health_center', contact: { _id: 'deleted_person' } };
      try {
        await assertSourcePrimaryContactType(mockDb, {}, sourceDoc);
        expect(warnStub.calledOnce).to.be.true;
        expect(warnStub.firstCall.args[0]).to.include('place_1');
        expect(warnStub.firstCall.args[0]).to.include('deleted_person');
      } finally {
        warnStub.restore();
      }
    });

    it('rethrows non-404 errors', async () => {
      const serverErr = Object.assign(new Error('server_error'), { status: 500 });
      const mockDb = { get: sinon.stub().rejects(serverErr) };
      const sourceDoc = { _id: 'place_1', type: 'health_center', contact: { _id: 'some_person' } };
      await expect(assertSourcePrimaryContactType(mockDb, {}, sourceDoc)).to.eventually.be.rejectedWith('server_error');
    });

    it('throws when primary contact is a place', async () => {
      const placeDoc = { _id: 'place_2', type: 'clinic' };
      const contactTypeInfo = { clinic: { parents: ['health_center'], person: false } };
      const mockDb = { get: sinon.stub().resolves(placeDoc) };
      const sourceDoc = { _id: 'place_1', type: 'health_center', contact: { _id: 'place_2' } };
      await expect(assertSourcePrimaryContactType(mockDb, contactTypeInfo, sourceDoc))
        .to.eventually.be.rejectedWith('which is of type place');
    });

    it('no error when primary contact is a person', async () => {
      const personDoc = { _id: 'person_1', type: 'person' };
      const contactTypeInfo = { person: { parents: ['health_center'], person: true } };
      const mockDb = { get: sinon.stub().resolves(personDoc) };
      const sourceDoc = { _id: 'place_1', type: 'health_center', contact: { _id: 'person_1' } };
      await assertSourcePrimaryContactType(mockDb, contactTypeInfo, sourceDoc);
    });
  });
});

const runScenario = async (contact_types, sourceType, destinationType, merge = false) => {
  const mockDb = { get: () => ({ settings: { contact_types } }) };
  const { assertNoHierarchyErrors } = await lineageConstraints(mockDb, { merge });
  return assertNoHierarchyErrors([{ _id: 'a', type: sourceType }], { _id: 'b', type: destinationType });
};
