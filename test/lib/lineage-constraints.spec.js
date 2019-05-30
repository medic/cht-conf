const { expect } = require('chai');
const rewire = require('rewire');
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const { mockHierarchy } = require('../mock-hierarchies');

const lineageConstraints = rewire('../../src/lib/lineage-constraints');
const log = require('../../src/lib/log');
log.level = log.LEVEL_INFO;

describe('lineage constriants', () => {
  describe('getConfigurableHierarchyErrors', () => {
    const scenario = async (contact_types, contactType, parentType) => {
      const mockDb = { get: () => ({ settings: { contact_types } }) };
      const { getConfigurableHierarchyErrors } = await lineageConstraints(mockDb, { type: parentType });
      return getConfigurableHierarchyErrors({ type: contactType });
    };

    it('no defined rules yields no error', async () => expect(await scenario(undefined, 'person', 'health_center')).to.be.undefined);
    
    it('no defined rules yields not defined', async () => expect(await scenario([], 'person', 'health_center')).to.include('not define'));
    it('no valid parent yields not defined', async () => expect(await scenario([undefined], 'person', 'health_center')).to.include('not define'));
    
    it('valid parent yields no error', async () => {
      const actual = await scenario([{
        id: 'person',
        parents: ['health_center'],
      }], 'person', 'health_center');

      expect(actual).to.be.undefined;
    });

    it('no contact type yields undefined error', async () => expect(await scenario([])).to.include('undefined'));
    it('no parent type yields undefined error', async () => expect(await scenario([], 'person')).to.include('undefined'));

    it('no valid parents yields not defined', async () => expect(await scenario([{
      id: 'person',
      parents: ['district_hospital'],
    }], 'person', 'health_center')).to.include('does not allow parent'));

    it('no settings doc yields not defined', async () => {
      const mockDb = { get: () => { throw { name: 'not_found' }; } };
      const { getConfigurableHierarchyErrors } = await lineageConstraints(mockDb, { type: 'parent' });
      const actual = getConfigurableHierarchyErrors({ type: 'contact' });
      expect(actual).to.be.undefined;
    });
  });

  describe('getPrimaryContactViolations', () => {
    const getConfigurableHierarchyErrors = lineageConstraints.__get__('getPrimaryContactViolations');

    describe('on memory pouchdb', async () => {
      let pouchDb, scenarioCount = 0;
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

        const doc = await getConfigurableHierarchyErrors(pouchDb, contactDoc, parentDoc, [contactDoc]);
        expect(doc).to.deep.include({ _id: 'clinic_1_contact' });
      });

      it('cannot move clinic_1_contact to root', async () => {
        const contactDoc = await pouchDb.get('clinic_1_contact');
        const doc = await getConfigurableHierarchyErrors(pouchDb, contactDoc, undefined, [contactDoc]);
        expect(doc).to.deep.include({ _id: 'clinic_1_contact' });
      });

      it('can move clinic_1_contact to clinic_1', async () => {
        const contactDoc = await pouchDb.get('clinic_1_contact');
        const parentDoc = await pouchDb.get('clinic_1');

        const doc = await getConfigurableHierarchyErrors(pouchDb, contactDoc, parentDoc, [contactDoc]);
        expect(doc).to.be.undefined;
      });

      it('can move health_center_2 to district_1', async () => {
        const contactDoc = await pouchDb.get('health_center_2');
        const parentDoc = await pouchDb.get('district_1');

        const descendants = await Promise.all(['health_center_2_contact', 'clinic_2', 'clinic_2_contact', 'patient_2'].map(id => pouchDb.get(id)));
        const doc = await getConfigurableHierarchyErrors(pouchDb, contactDoc, parentDoc, descendants);
        expect(doc).to.be.undefined;
      });

      it('when district_1 contact is patient_1. cannot move health_center_1 to district_2', async () => {
        const district1 = await pouchDb.get('district_1');
        district1.contact._id = 'patient_1';
        await pouchDb.put(district1);

        const contactDoc = await pouchDb.get('health_center_1');
        const parentDoc = await pouchDb.get('district_2');

        const descendants = await Promise.all(['health_center_1_contact', 'clinic_1', 'clinic_1_contact', 'patient_1'].map(id => pouchDb.get(id)));
        const doc = await getConfigurableHierarchyErrors(pouchDb, contactDoc, parentDoc, descendants);
        expect(doc).to.deep.include({ _id: 'patient_1' });
      });
    });
  });
});
