const { assert, expect } = require('chai');
const rewire = require('rewire');
const sinon = require('sinon');

const api = require('../api-stub');
const environment = require('../../src/lib/environment');
const uploadForms = rewire('../../src/lib/upload-forms');
const log = require('../../src/lib/log');

const BASE_DIR = 'data/lib/upload-forms';
const FORMS_SUBDIR = '.';

describe('upload-forms', () => {

  beforeEach(api.start);
  afterEach(api.stop);

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

  it('should merge supported properties into form', () => {
    const logWarn = sinon.spy(log, 'warn');
    // when
    return uploadForms(`${BASE_DIR}/merge-properties`, FORMS_SUBDIR)
      .then(() => {
        expect(logWarn.callCount).to.equal(2);
        expect(logWarn.args[0][0]).to.equal('DEPRECATED: data/lib/upload-forms/merge-properties/forms/./example.properties.json. Please do not manually set internalId in .properties.json for new projects. Support for configuring this value will be dropped. Please see https://github.com/medic/medic-webapp/issues/3342.');
        expect(logWarn.args[1][0]).to.equal('Ignoring unknown properties in data/lib/upload-forms/merge-properties/forms/./example.properties.json: unknown');
      })
      .then(() => api.db.get('form:example'))
      .then(form => {
        expect(form.type).to.equal('form');
        expect(form.internalId).to.equal('different');
        expect(form.title).to.equal('Merge properties');
        expect(form.context).to.deep.equal({ person: true, place: false });
        expect(form.icon).to.equal('example');
        expect(form.xml2sms).to.equal('hello world');
      });
  });

});
