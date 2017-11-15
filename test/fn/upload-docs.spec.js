const api = require('../api-stub');
const assert = require('chai').assert;
const uploadDocs = require('../../src/fn/upload-docs');

describe('upload-docs', function() {
  beforeEach(api.start);
  afterEach(api.stop);
  
  it('should upload docs to pouch', function(done) {

    // given
    const testDir = `data/upload-docs`;

    assertDbEmpty()

      .then(() => /* when */ uploadDocs(testDir, api.couchUrl))

      .then(() => api.db.allDocs())
      .then(res =>

          // then
          assert.deepEqual(res.rows.map(doc => doc.id), [
            'one', 'three', 'two'
          ]))

      .then(done)
      .catch(done);


  });

});

function assertDbEmpty() {
  return api.db.allDocs()
    .then(res => assert.equal(res.rows.length, 0));
}
