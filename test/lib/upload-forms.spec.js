const { assert } = require('chai');
const sinon = require('sinon');

const environment = require('../../src/lib/environment');
const uploadForms = require('../../src/lib/upload-forms');

const BASE_DIR = 'data/lib/upload-forms';
const FORMS_SUBDIR = '.';

describe('upload-forms', function() {
  it('should reject forms which do not have <meta><instanceID/></meta>', function() {
    sinon.stub(environment, 'apiUrl').get(() => 'http://example.com/db-name');
    // when
    return uploadForms(`${BASE_DIR}/no-instance-id`, FORMS_SUBDIR)

      .then(() => assert.fail('Expected Error to be thrown.'))

      .catch(e => {
        assert.include(e.message, 'This form will not work on medic-webapp.');
      });
  });
});
