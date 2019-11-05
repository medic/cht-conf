const { assert, expect } = require('chai');
const rewire = require('rewire');
const sinon = require('sinon');

const environment = require('../../src/lib/environment');
const uploadForms = rewire('../../src/lib/upload-forms');

const BASE_DIR = 'data/lib/upload-forms';
const FORMS_SUBDIR = '.';

describe('upload-forms', () => {
  it('should reject forms which do not have <meta><instanceID/></meta>', () => {
    sinon.stub(environment, 'apiUrl').get(() => 'http://example.com/db-name');
    // when
    return uploadForms(`${BASE_DIR}/no-instance-id`, FORMS_SUBDIR)

      .then(() => assert.fail('Expected Error to be thrown.'))

      .catch(e => {
        assert.include(e.message, 'This form will not work on medic-webapp.');
      });
  });

  it('form filter limits uploaded forms', async () => {
    const insertOrReplace = sinon.stub();
    return uploadForms.__with__({ insertOrReplace })(async () => {
      await uploadForms(`${BASE_DIR}/no-instance-id`, FORMS_SUBDIR, { forms: ['dne'] });
      expect(insertOrReplace.called).to.be.false;
    });
  });
});
