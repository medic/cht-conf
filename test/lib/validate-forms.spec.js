const { assert, expect } = require('chai');
const rewire = require('rewire');
const sinon = require('sinon');

const log = require('../../src/lib/log');
const environment = require('../../src/lib/environment');

const validateForms = rewire('../../src/lib/validate-forms');

const BASE_DIR = 'data/lib/upload-forms';
const FORMS_SUBDIR = '.';

const mockValidation = (output = {}) => ({
  requiresInstance: true,
  skipFurtherValidation: false,
  execute: sinon.stub().resolves(output)
});

describe('validate-forms', () => {
  let logInfo;
  let logWarn;
  let logError;

  beforeEach(() => {
    sinon.stub(environment, 'apiUrl').get(() => true);
    logInfo = sinon.stub(log, 'info');
    logWarn = sinon.stub(log, 'warn');
    logError = sinon.stub(log, 'error');
  });

  afterEach(sinon.restore);

  it('should properly load validations', () => {
    const validations = validateForms.__get__('validations');

    const hasInstanceId = validations.shift();
    expect(hasInstanceId.name).to.equal('has-instance-id.js');
    expect(hasInstanceId.requiresInstance).to.equal(false);
    expect(hasInstanceId.skipFurtherValidation).to.equal(true);

    const canGeneratexForm = validations.shift();
    expect(canGeneratexForm.name).to.equal('can-generate-xform.js');
    expect(canGeneratexForm.requiresInstance).to.equal(true);
    expect(canGeneratexForm.skipFurtherValidation).to.equal(false);

    expect(validations).to.be.empty;
  });

  it('should throw an error when there are validation errors', () => {
    const errorValidation = mockValidation({ errors: ['Error 1', 'Error 2'] });
    return validateForms.__with__({ validations: [errorValidation] })(async () => {
      try {
        await validateForms(`${BASE_DIR}/good-and-bad-forms`, FORMS_SUBDIR);
        assert.fail('Expected Error to be thrown.');
      } catch (e) {
        assert.include(e.message, 'One or more forms have failed validation.');
        expect(logInfo.callCount).to.equal(2);
        expect(logInfo.args[0][0]).to.equal('Validating form: example-no-id.xml…');
        expect(logInfo.args[1][0]).to.equal('Validating form: example.xml…');
        expect(logError.callCount).to.equal(4);
        expect(logError.args[0][0]).to.equal('Error 1');
        expect(logError.args[1][0]).to.equal('Error 2');
        expect(logError.args[2][0]).to.equal('Error 1');
        expect(logError.args[3][0]).to.equal('Error 2');
      }
    });
  });

  it('should warn when skipping validation that requires instance', () => {
    sinon.stub(environment, 'apiUrl').get(() => false);
    const errorValidation = mockValidation({ errors: ['Should not see this error.'] });
    const warningValidation = mockValidation({ warnings: ['Warning'] });
    warningValidation.requiresInstance = false;
    return validateForms.__with__({ validations: [errorValidation, warningValidation] })(async () => {
      await validateForms(`${BASE_DIR}/merge-properties`, FORMS_SUBDIR);
      expect(logInfo.callCount).to.equal(1);
      expect(logInfo.args[0][0]).to.equal('Validating form: example.xml…');
      expect(logWarn.callCount).to.equal(2);
      expect(logWarn.args[0][0]).to.equal('Warning');
      expect(logWarn.args[1][0]).to.equal('Some validations have been skipped because they require a CHT instance.');
    });
  });

  it('should skip additional validations for form when configured', () => {
    const errorValidation = mockValidation({ errors: ['Error'] });
    errorValidation.skipFurtherValidation = true;
    const skippedValidation = mockValidation({ errors: ['Should not see this error.'] });
    return validateForms.__with__({ validations: [errorValidation, skippedValidation] })(async () => {
      try {
        await validateForms(`${BASE_DIR}/good-and-bad-forms`, FORMS_SUBDIR);
        assert.fail('Expected Error to be thrown.');
      } catch (e) {
        assert.include(e.message, 'One or more forms have failed validation.');
        expect(logInfo.callCount).to.equal(2);
        expect(logInfo.args[0][0]).to.equal('Validating form: example-no-id.xml…');
        expect(logInfo.args[1][0]).to.equal('Validating form: example.xml…');
        expect(logError.callCount).to.equal(2);
        expect(logError.args[0][0]).to.equal('Error');
        expect(logError.args[1][0]).to.equal('Error');
      }
    });
  });

  it('should resolve OK if all validations pass', () => {
    return validateForms.__with__({ validations: [mockValidation(), mockValidation(), mockValidation()] })(async () => {
      await validateForms(`${BASE_DIR}/merge-properties`, FORMS_SUBDIR);
      expect(logInfo.callCount).to.equal(1);
      expect(logInfo.args[0][0]).to.equal('Validating form: example.xml…');
    });
  });

  it('should resolve OK if there are only warnings', () => {
    const warningValidation = mockValidation({ warnings: ['Warning 1', 'Warning 2'] });
    return validateForms.__with__({ validations: [warningValidation] })(async () => {
      await validateForms(`${BASE_DIR}/good-and-bad-forms`, FORMS_SUBDIR);
      expect(logInfo.callCount).to.equal(2);
      expect(logInfo.args[0][0]).to.equal('Validating form: example-no-id.xml…');
      expect(logInfo.args[1][0]).to.equal('Validating form: example.xml…');
      expect(logWarn.callCount).to.equal(4);
      expect(logWarn.args[0][0]).to.equal('Warning 1');
      expect(logWarn.args[1][0]).to.equal('Warning 2');
      expect(logWarn.args[2][0]).to.equal('Warning 1');
      expect(logWarn.args[3][0]).to.equal('Warning 2');
    });
  });

  it('should resolve OK if form directory cannot be found', () => {
    return validateForms.__with__({ validations: [mockValidation(), mockValidation(), mockValidation()] })(async () => {
      await validateForms(`${BASE_DIR}/non-existant-directory`, FORMS_SUBDIR);
      expect(logInfo.callCount).to.equal(1);
      expect(logInfo.args[0][0]).to.equal(`Forms dir not found: ${BASE_DIR}/non-existant-directory/forms/${FORMS_SUBDIR}`);
    });
  });
});
