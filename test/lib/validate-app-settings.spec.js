const { expect } = require('chai');

const validateAppSettings = require('../../src/lib/validate-app-settings');

describe('validate-app-settings', () => {

  describe('validateFormsSchema', () => {

    const isValid = (formsObject) => {
      const result = validateAppSettings.validateFormsSchema(formsObject);
      expect(result.valid).to.be.true;
    };

    const isNotValid = (formsObject, errorMessage) => {
      const result = validateAppSettings.validateFormsSchema(formsObject);
      expect(result.valid).to.be.false;
      expect(result.error.details.length).to.equal(1);
      expect(result.error.details[0].message).to.equal(errorMessage);
    };

    it('returns true for empty config', () => {
      isValid({});
    });

    it('returns true for basic config', () => {
      isValid({
        DR: {
          meta: { code: 'DR' },
          fields: {
            patient_id: {
              position: 0,
              flags: { input_digits_only: true },
              length: [5, 13],
              type: 'string',
              required: true
            }
          }
        }
      });
    });

    it('returns true when form name contains Nepali characters - #471', () => {
      isValid({
        क: {
          meta: { code: 'क' },
          fields: {
            क: { type: 'string' }
          }
        }
      });
    });

    it('returns true when form name contains French accents', () => {
      isValid({
        voilà: {
          meta: { code: 'voilà' },
          fields: {
            voilà: { type: 'string' }
          }
        }
      });
    });

    it('returns true when field name contains anything', () => {
      isValid({
        r: {
          meta: { code: 'r' },
          fields: {
            '#!$àक': { type: 'string' }
          }
        }
      });
    });

    it('returns false when meta missing', () => {
      isNotValid({
        DR: {
          fields: {
            patient_id: { type: 'string' }
          }
        }
      }, '"DR.meta" is required');
    });

  });

  describe('validateSchedulesSchema', () => {
    const isValid = (schedulesObject) => {
      const result = validateAppSettings.validateScheduleSchema(schedulesObject);
      expect(result.valid).to.be.true;
    };

    const isNotValid = (schedulesObject, errorMessage) => {
      const result = validateAppSettings.validateScheduleSchema(schedulesObject);
      expect(result.valid).to.be.false;
      expect(result.error.details.length).to.equal(1);
      expect(result.error.details[0].message).to.equal(errorMessage);
    };

    it('returns valid for starter schedule.', () => {
      isValid([{
        name: 'schedule name',
        messages: [{
          translation_key: 'a.b',
          group: '1',
          offset: '0'
        }]
      }]);
    });

    it('start_from as string is valid.', () => {
      isValid([{
        name: 'schedule name',
        start_from: 'dob',
        messages: [{
          translation_key: 'a.b',
          group: '1',
          offset: '0'
        }]
      }]);
    });

    it('start_from as an array is valid.', () => {
      isValid([{
        name: 'schedule name',
        start_from: ['dob', 'lmp_date'],
        messages: [{
          translation_key: 'a.b',
          group: '1',
          offset: '0'
        }]
      }]);
    });

    it('start_from as a number is invalid.', () => {
      isNotValid([{
        name: 'schedule name',
        start_from: 1,
        messages: [{
          translation_key: 'a.b',
          group: '1',
          offset: '0'
        }]
      }], '"[0].start_from" must be one of [string, array]');
    });

  });

});
