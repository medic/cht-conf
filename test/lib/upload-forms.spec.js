const { expect } = require('chai');
const rewire = require('rewire');
const sinon = require('sinon');

const api = require('../api-stub');
const uploadForms = rewire('../../src/lib/upload-forms');
const log = require('../../src/lib/log');

const BASE_DIR = 'data/lib/upload-forms';
const FORMS_SUBDIR = '.';

describe('upload-forms', () => {

  beforeEach(api.start);
  afterEach(api.stop);

  it('form filter limits uploaded forms', async () => {
    const insertOrReplace = sinon.stub();
    return uploadForms.__with__({ insertOrReplace })(async () => {
      await uploadForms(`${BASE_DIR}/no-instance-id`, FORMS_SUBDIR, { forms: ['dne'] });
      expect(insertOrReplace.called).to.be.false;
    });
  });

  it('should merge supported properties into form', async () => {
    return uploadForms.__with__({
      api: {
        formsValidate: ()=> Promise.resolve({ok: true})
      }
    })(async () => {
      const logWarn = sinon.spy(log, 'warn');
      await uploadForms(`${BASE_DIR}/merge-properties`, FORMS_SUBDIR);
      expect(logWarn.callCount).to.equal(2);
      expect(logWarn.args[0][0]).to.equal('DEPRECATED: data/lib/upload-forms/merge-properties/forms/./example.properties.json. Please do not manually set internalId in .properties.json for new projects. Support for configuring this value will be dropped. Please see https://github.com/medic/medic-webapp/issues/3342.');
      expect(logWarn.args[1][0]).to.equal('Ignoring unknown properties in data/lib/upload-forms/merge-properties/forms/./example.properties.json: unknown');
      const form = await api.db.get('form:example');
      expect(form.type).to.equal('form');
      expect(form.internalId).to.equal('different');
      expect(form.title).to.equal('Merge properties');
      expect(form.context).to.deep.equal({ person: true, place: false });
      expect(form.icon).to.equal('example');
      expect(form.xml2sms).to.equal('hello world');
      expect(form.subject_key).to.equal('some.translation.key');
      expect(form.hidden_fields[0]).to.equal('hidden');
    });
  });

});
