const api = require('../api-stub');
const assert = require('chai').assert;
const ncp = require('ncp');
const uploadDocs = require('../../src/fn/upload-docs');

describe('upload-docs', function() {
  beforeEach(api.start);
  afterEach(api.stop);
  
  it('should upload docs to pouch', function(done) {

    // given
    const srcDir = `test/data/upload-docs`;
    const testDir = `build/test/upload-docs`;

    ncp(srcDir, testDir, err => {
      if(err) done(err);

      // and
      // TODO there are no docs in the db

      // when
      uploadDocs(testDir, api.couchUrl)

        .then(() => {

          api.db.allDocs()
            .then(res => {

              // then
              assert.deepEqual(res.rows.map(doc => doc.id), [
                'one', 'three', 'two'
              ]);

              done();

            })
            .catch(done);

        });

    });

  });

});
