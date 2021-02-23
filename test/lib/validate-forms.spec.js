const { assert } = require('chai');
const rewire = require('rewire');
const sinon = require('sinon');

const environment = require('../../src/lib/environment');
const validateForms = rewire('../../src/lib/validate-forms');

const BASE_DIR = 'data/lib/upload-forms';
const FORMS_SUBDIR = '.';

describe('validate-forms', () => {

  it('should reject forms which do not have <meta><instanceID/></meta>', () => {
    sinon.stub(environment, 'apiUrl').get(() => 'http://example.com/db-name');
    // when
    return validateForms(`${BASE_DIR}/no-instance-id`, FORMS_SUBDIR)

      .then(() => assert.fail('Expected Error to be thrown.'))

      .catch(e => {
        assert.include(e.message, 'One or more forms appears to be missing <meta><instanceID/></meta> node.');
      });
  });

  //TODO Add forms validations tests
});
