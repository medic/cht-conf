const { assert, expect } = require('chai');
const fs = require('fs');
const rewire = require('rewire');
const sinon = require('sinon');

const api = require('../../src/lib/api');
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
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    logInfo = sinon.stub(log, 'info');
    logWarn = sinon.stub(log, 'warn');
    logError = sinon.stub(log, 'error');
    sinon.stub(api(), 'version').resolves('1.0.0');
  });

  afterEach(sinon.restore);

  it('should properly load validations', () => {
    const validations = validateForms.__get__('validations');
    const validationNames = validations.map(v => v.name);

    expect(validations.length).to.equal(6);
    expect(validationNames).to.include('has-instance-id.js');
    expect(validationNames).to.include('can-generate-xform.js');
    expect(validationNames).to.include('check-xpaths-exist.js');
    expect(validationNames).to.include('deprecated-appearance.js');
    expect(validationNames).to.include('no-required-notes.js');
    expect(validationNames).to.include('forms-db-doc-is-valid.js');
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

  // THIS IS THE CORRECTED TEST
  it('should resolve OK if all validations pass', () => {
    const validation = mockValidation();
    // We now create a full list of 6 mocks to match the 6 real validations.
    const allMockValidations = [
      validation,
      mockValidation(),
      mockValidation(),
      mockValidation(),
      mockValidation(),
      mockValidation(),
    ];
    return validateForms.__with__({ validations: allMockValidations })(async () => {
      await validateForms(`${BASE_DIR}/merge-properties`, FORMS_SUBDIR);
      expect(logInfo.callCount).to.equal(1);
      expect(logInfo.args[0][0]).to.equal('Validating form: example.xml…');
      // Assert params passed to validations
      const {args} = validation.execute;
      expect(args.length).to.equal(1);
      const { xformPath, xmlStr, xmlDoc, apiVersion } = args[0][0];
      const expectedXmlPath = `${BASE_DIR}/merge-properties/forms/${FORMS_SUBDIR}/example.xml`;
      const expectedXmlStr = fs.readFileSync(expectedXmlPath, 'utf8');
      expect(xformPath).to.equal(expectedXmlPath);
      expect(xmlStr).to.equal(expectedXmlStr);
      // Make sure valid xml doc is passed in
      expect(xmlDoc.getElementsByTagName('h:title')[0].textContent).to.equal('Merge properties');
      expect(apiVersion).to.equal('1.0.0');
    });
  });

  it('should not pass invalid api version to validations', () => {
    api().version.resolves('invalid');
    const validation = mockValidation();
    return validateForms.__with__({ validations: [validation] })(async () => {
      await validateForms(`${BASE_DIR}/merge-properties`, FORMS_SUBDIR);
      // Assert params passed to validations
      const {args} = validation.execute;
      expect(args.length).to.equal(1);
      const { apiVersion } = args[0][0];
      expect(apiVersion).to.be.null;
    });
  });

  it('should not pass api version to validations when no instance provided', () => {
    sinon.stub(environment, 'apiUrl').get(() => false);
    const validation = {
      execute: sinon.stub().resolves({ })
    };
    return validateForms.__with__({ validations: [validation] })(async () => {
      await validateForms(`${BASE_DIR}/merge-properties`, FORMS_SUBDIR);
      // Assert params passed to validations
      const {args} = validation.execute;
      expect(args.length).to.equal(1);
      const { apiVersion } = args[0][0];
      expect(apiVersion).to.be.null;
      expect(api().version.callCount).to.equal(0);
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
      expect(logInfo.args[0][0]).to.equal(
        `Forms dir not found: ${BASE_DIR}/non-existant-directory/forms/${FORMS_SUBDIR}`
      );
    });
  });
});