const { expect } = require('chai');
const sinon = require('sinon');

const canGenerateXForm = require('../../../../src/lib/validation/form/can-generate-xform');

const api = require('../../../../src/lib/api');
const environment = require('../../../../src/lib/environment');

const xformPath = '/my/form/path/form.xml';
const xmlStr = '<?xml version="1.0"?>';

describe('can-generate-xform', () => {
  beforeEach(() => {
    sinon.stub(environment, 'isArchiveMode').get(() => false);
  });

  afterEach(sinon.restore);

  it('should resolve OK when form has instance id', () => {
    sinon.stub(api(), 'formsValidate').resolves({ formsValidateEndpointFound: true });

    return canGenerateXForm.execute({ xformPath, xmlStr })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.empty;
      });
  });

  it('should return warning when forms validation endpoint not found', () => {
    sinon.stub(api(), 'formsValidate').resolves({ formsValidateEndpointFound: false });

    return canGenerateXForm.execute({ xformPath, xmlStr })
      .then(output => {
        expect(output.warnings).deep
          .equals([
            'Form validation endpoint not found in your version of CHT Core, no form will be checked before push'
          ]);
        expect(output.errors).is.empty;
      });
  });

  it('should return error when forms validation endpoint not found', () => {
    const err = new Error('Failed validation.');
    sinon.stub(api(), 'formsValidate').throws(err);

    return canGenerateXForm.execute({ xformPath, xmlStr })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).deep.equals([
          `Error found while validating "${xformPath}". Validation response: ${err.message}`
        ]);
      });
  });
});
