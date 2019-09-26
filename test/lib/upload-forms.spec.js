const assert = require('chai').assert;
const uploadForms = require('../../src/lib/upload-forms');

const BASE_DIR = 'data/lib/upload-forms';
const COUCH_URL = 'http://example.com/db-name';
const FORMS_SUBDIR = '.';

describe('upload-forms', function() {
  it('should reject forms which do not have <meta><instanceID/></meta>', function() {

    // when
    return uploadForms(`${BASE_DIR}/no-instance-id`, COUCH_URL, FORMS_SUBDIR)

      .then(() => assert.fail('Expected Error to be thrown.'))

      .catch(e => {
        assert.include(e.message, 'This form will not work on medic-webapp.');
      });
  });
});
