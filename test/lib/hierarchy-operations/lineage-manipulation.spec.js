const { expect } = require('chai');
const { replaceParentLineage, replaceContactLineage, pluckIdsFromLineage, minifyLineagesInDoc } = require('../../../src/lib/hierarchy-operations/lineage-manipulation');
const log = require('../../../src/lib/log');
log.level = log.LEVEL_TRACE;

const { parentsToLineage } = require('../../mock-hierarchies');

describe('lineage manipulation', () => {
  const mockReport = data => Object.assign({ _id: 'r', type: 'data_record', contact: parentsToLineage('parent', 'grandparent') }, data);
  const mockContact = data => Object.assign({ _id: 'c', type: 'person', parent: parentsToLineage('parent', 'grandparent') }, data);

  describe('replaceParentLineage', () => {
    it('replace full lineage', () => {
      const mock = mockContact();
      const replaceLineageOptions = {
        replaceWith: parentsToLineage('new_parent'),
      };
      expect(replaceParentLineage(mock, replaceLineageOptions)).to.be.true;
      expect(mock).to.deep.eq({
        _id: 'c',
        type: 'person',
        parent: parentsToLineage('new_parent'),
      });
    });

    it('replace an empty lineage', () => {
      const mock = mockContact();
      delete mock.parent;

      const replaceLineageOptions = {
        replaceWith: parentsToLineage('new_parent'),
      };
      expect(replaceParentLineage(mock, replaceLineageOptions)).to.be.true;
      expect(mock).to.deep.eq({
        _id: 'c',
        type: 'person',
        parent: parentsToLineage('new_parent'),
      });
    });

    it('replace empty with empty', () => {
      const mock = mockContact();
      delete mock.parent;

      const replaceLineageOptions = {
        replaceWith: undefined,
      };
      expect(replaceParentLineage(mock, replaceLineageOptions)).to.be.false;
    });

    it('replace lineage starting at contact', () => {
      const mock = mockContact();

      const replaceLineageOptions = {
        replaceWith: parentsToLineage('new_grandparent'),
        startingFromId: 'parent',
      };
      expect(replaceParentLineage(mock, replaceLineageOptions)).to.be.true;
      expect(mock).to.deep.eq({
        _id: 'c',
        type: 'person',
        parent: parentsToLineage('parent', 'new_grandparent'),
      });
    });

    it('merge new parent', () => {
      const mock = mockContact();
      const replaceLineageOptions = {
        replaceWith: parentsToLineage('new_parent', 'new_grandparent'),
        startingFromId: 'parent',
        merge: true,
      };
      expect(replaceParentLineage(mock, replaceLineageOptions)).to.be.true;
      expect(mock).to.deep.eq({
        _id: 'c',
        type: 'person',
        parent: parentsToLineage('new_parent', 'new_grandparent'),
      });
    });

    it('replace empty starting at contact', () => {
      const mock = mockContact();
      const replaceLineageOptions = {
        replaceWith: undefined,
        startingFromId: 'parent',
      };
      expect(replaceParentLineage(mock, replaceLineageOptions)).to.be.true;
      expect(mock).to.deep.eq({
        _id: 'c',
        type: 'person',
        parent: parentsToLineage('parent'),
      });
    });

    it('replace starting at non-existant contact', () => {
      const mock = mockContact();
      const replaceLineageOptions = {
        replaceWith: parentsToLineage('irrelevant'),
        startingFromId: 'dne',
      };
      expect(replaceParentLineage(mock, replaceLineageOptions)).to.be.false;
    });
  });

  describe('replaceContactLineage', () => {
    it('replace with empty lineage', () => {
      const mock = mockReport();
      const replaceLineageOptions = {
        replaceWith: undefined,
      };
      expect(replaceContactLineage(mock, replaceLineageOptions)).to.be.true;
      expect(mock).to.deep.eq({
        _id: 'r',
        type: 'data_record',
        contact: undefined,
      });
    });

    it('merge grandparent of contact', () => {
      const mock = mockReport();
      const replaceLineageOptions = {
        replaceWith: parentsToLineage('new_grandparent'),
        startingFromId: 'grandparent',
        merge: true,
      };
      expect(replaceContactLineage(mock, replaceLineageOptions)).to.be.true;
      expect(mock).to.deep.eq({
        _id: 'r',
        type: 'data_record',
        contact: parentsToLineage('parent', 'new_grandparent'),
      });
    });
  });

  describe('pluckIdsFromLineage', () => {
    it('empty', () => expect(pluckIdsFromLineage(parentsToLineage())).to.deep.eq([]));
    it('nominal', () => expect(pluckIdsFromLineage(parentsToLineage('1', '2', '3'))).to.deep.eq(['1', '2', '3']));
  });

  describe('minifyLineagesInDoc', () => {
    it('root parent does not crash', () => expect(minifyLineagesInDoc()).to.be.undefined);

    it('when doc has no parent', () => {
      const parentDoc = {
        _id: 'parent_id',
      };
      minifyLineagesInDoc(parentDoc);
      expect(parentDoc).to.deep.eq({
        _id: 'parent_id',
      });
    });

    it('doc parent is minified', () => {
      const parentDoc = {
        _id: 'parent_1',
        parent: {
          _id: 'parent_2',
          parent: {
            _id: 'parent_3',
            not: 'important',
            definitely: {
              not: 'important',
            }
          },
          foo: 'bar',
        },
      };
      minifyLineagesInDoc(parentDoc);
      expect(parentDoc).to.deep.eq({
        _id: 'parent_1',
        parent: {
          _id: 'parent_2',
          parent: {
            _id: 'parent_3',
            parent: undefined,
          }
        },
      });
    });

    it('only truthy parents are preserved', () => {
      const parentDoc = {
        _id: 'parent_id',
        parent: '',
      };
      minifyLineagesInDoc(parentDoc);
      expect(parentDoc).to.deep.eq({
        _id: 'parent_id',
        parent: undefined,
      });
    });
  });
});
