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

  afterEach(() => {
    sinon.restore();
    return api.stop();
  });

  const validateForms = sinon.stub().resolves();

  it('form filter limits uploaded forms', async () => {
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    const insertOrReplace = sinon.stub();
    const logWarn = sinon.stub(log, 'warn');
    return uploadForms.__with__({ insertOrReplace, validateForms })(async () => {
      await uploadForms.execute(`${BASE_DIR}/no-instance-id`, FORMS_SUBDIR, { forms: ['dne'] });
      expect(insertOrReplace.called).to.be.false;
      expect(logWarn.args[0][0]).to.equal('No matches found for files matching form filter: dne.xml');
    });
  });

  it('should merge supported properties into form', async () => {
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    sinon.stub(environment, 'pathToProject').get(() => '.');
    sinon.stub(Date, 'now').returns(123123);
    return uploadForms.__with__({ validateForms })(async () => {
      const logInfo = sinon.stub(log, 'info');
      const logWarn = sinon.stub(log, 'warn');
      await uploadForms.execute(`${BASE_DIR}/merge-properties`, FORMS_SUBDIR);
      expect(logInfo.args[0][0]).to.equal('Preparing form for upload: example.xml…');
      expect(logWarn.callCount).to.equal(2);
      expect(logWarn.args[0][0]).to.equal(
        'DEPRECATED: data/lib/upload-forms/merge-properties/forms/./example.properties.json. ' +
        'Please do not manually set internalId in .properties.json for new projects. ' +
        'Support for configuring this value will be dropped. ' +
        'Please see https://github.com/medic/cht-core/issues/3342.'
      );
      expect(logWarn.args[1][0]).to.equal(
        'Ignoring unknown properties in ' +
        'data/lib/upload-forms/merge-properties/forms/./example.properties.json: unknown'
      );
      const form = await api.db.get('form:example');
      expect(form.type).to.equal('form');
      expect(form.internalId).to.equal('different');
      expect(form.xmlVersion.time).to.equal(123123);
      expect(form.xmlVersion.sha256).to.equal('7e3bb121779a8e9f707b6e1db4c1b52aa6e875b5015b41b0a9115efa2d0de1d1');
      expect(form.title).to.equal('Merge properties');
      expect(form.context).to.deep.equal({ person: true, place: false });
      expect(form.icon).to.equal('example');
      expect(form.xml2sms).to.equal('hello world');
      expect(form.subject_key).to.equal('some.translation.key');
      expect(form.hidden_fields[0]).to.equal('hidden');
    });
  });

  xit('should stop upload if one validation fails', async () => {
    const insertOrReplace = sinon.stub();
    return uploadForms.__with__({
      insertOrReplace,
      validateForms: sinon.stub().rejects('The error')
    })(async () => {
      try {
        await uploadForms.execute(`${BASE_DIR}/merge-properties`, FORMS_SUBDIR);
        assert.fail('Expected Error to be thrown.');
      } catch (e) {
        expect(insertOrReplace.called).to.be.false;
      }
    });
  });

  it('should consume "duplicate_check" property for contact', async () => {
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    sinon.stub(environment, 'pathToProject').get(() => '.');
    sinon.stub(Date, 'now').returns(123123);
    return uploadForms.__with__({ validateForms })(async () => {
      const logInfo = sinon.stub(log, 'info');
      const logWarn = sinon.stub(log, 'warn');
      await uploadForms.execute(`${BASE_DIR}/duplicate_check-properties`, 'contact');
      expect(logInfo.args[0][0]).to.equal('Preparing form for upload: example.xml…');
      expect(logWarn.callCount).to.equal(0);
      const form = await api.db.get('form:example');
      expect(form.duplicate_check).to.deep.equal({
        'expression': 'levenshteinEq(current.name, existing.name, 3) && ageInYears(current) === ageInYears(existing)',
        'disabled': true
      });
    });
  });

  it('should ignore "duplicate_check" property for report', async () => {
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    sinon.stub(environment, 'pathToProject').get(() => '.');
    sinon.stub(Date, 'now').returns(123123);
    return uploadForms.__with__({ validateForms })(async () => {
      const logInfo = sinon.stub(log, 'info');
      const logWarn = sinon.stub(log, 'warn');
      await uploadForms.execute(`${BASE_DIR}/duplicate_check-properties`, 'report');
      expect(logInfo.args[0][0]).to.equal('Preparing form for upload: example.xml…');
      expect(logWarn.callCount).to.equal(1);
      const form = await api.db.get('form:example');
      expect(form.duplicate_check).to.deep.equal(undefined);
      expect(logWarn.args[0][0]).to.equal(
        'Ignoring unknown properties in '+
        'data/lib/upload-forms/duplicate_check-properties/forms/report/example.properties.json: '+
        'duplicate_check'
      );
    });
  });

});
