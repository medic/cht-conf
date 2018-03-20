const api = require('../api-stub');
const assert = require('chai').assert;
const createUsers = require('../../src/fn/create-users');

describe('create-users', function() {
  beforeEach(api.start);
  afterEach(api.stop);

  it('should create one user for each row in a CSV file', function(done) {

    // given
    const testDir = `data/create-users`;
    api.giveResponses({ body: {} }, { body: {} });

    // and
    const alice = {
      username: 'alice',
      password: 'Secret_1',
      type: 'district-manager',
      contact: {
	c_prop: 'c_val_a',
      },
      place: {
	c_prop: 'p_val_a',
	name: 'alice area',
	parent: 'abc-123',
	type: 'health_center',
      },
    };
    const bob = {
      username: 'bob',
      password: 'Secret_2',
      type: 'district-manager',
      contact: {
	c_prop: 'c_val_b',
      },
      place: {
	c_prop: 'p_val_b',
	name: 'bob area',
	parent: 'def-456',
	type: 'health_center',
      },
    };

    assertDbEmpty()

      .then(() => /* when */ createUsers(testDir, api.couchUrl))

      .then(() => assert.deepEqual(
        api.requestLog(),
        [
          { method:'POST', url:'/api/v1/users', body:alice },
          { method:'POST', url:'/api/v1/users', body:bob },
        ]))

      .then(done)
      .catch(done);

  });

});

function assertDbEmpty() {
  return api.db.allDocs()
    .then(res => assert.equal(res.rows.length, 0));
}
