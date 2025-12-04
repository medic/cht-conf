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

    it('start_from as single element on array is valid.', () => {
      isValid([{
        name: 'schedule name',
        start_from: ['dob'],
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

    it('recipient as string is valid.', () => {
      isValid([{
        name: 'schedule name',
        start_from: 'dob',
        messages: [{
          translation_key: 'a.b',
          group: '1',
          offset: '0',
          recipient: 'patient'
        }]
      }]);
    });

    it('recipient as single array element is valid.', () => {
      isValid([{
        name: 'schedule name',
        start_from: 'dob',
        messages: [{
          translation_key: 'a.b',
          group: '1',
          offset: '0',
          recipient: ['patient']
        }]
      }]);
    });

    it('recipient as multiple array element is valid.', () => {
      isValid([{
        name: 'schedule name',
        start_from: 'dob',
        messages: [{
          translation_key: 'a.b',
          group: '1',
          offset: '0',
          recipient: ['patient','praent.phone','link:g30_phone']
        }]
      }]);
    });   

    it('recipient as a number is invalid.', () => {
      isNotValid([{
        name: 'schedule name',
        start_from: 'dob',
        messages: [{
          translation_key: 'a.b',
          group: '1',
          offset: '0',
          recipient: 98410
        }]
      }], '"[0].messages[0].recipient" must be one of [string, array]');
    });

    it('recipient as number within string is valid.', () => {
      isValid([{
        name: 'schedule name',
        start_from: 'dob',
        messages: [{
          translation_key: 'a.b',
          group: '1',
          offset: '0',
          recipient: '98410'
        }]
      }]);
    });


  });

  describe('validateAssetlinks', () => {
    const isValid = (assetlinks) => {
      const result = validateAppSettings.validateAssetlinks(assetlinks);
      expect(result.valid).to.be.true;
    };

    const isNotValid = (assetlinks, errorMessage) => {
      const result = validateAppSettings.validateAssetlinks(assetlinks);
      expect(result.valid).to.be.false;
      expect(result.error.details.length).to.equal(1);
      expect(result.error.details[0].message).to.equal(errorMessage);
    };

    it('returns true for assetlinks with one entry', () => {
      isValid([{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'org.medicmobile.webapp.mobile',
          sha256_cert_fingerprints: ['long sha256 fingerprint 62:BF:C1:78...']
        }
      }]);
    });

    it('returns true for assetlinks with multiple entries', () => {
      // for example when associating 1 domain to multiple apks
      isValid([
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: 'org.medicmobile.webapp.mobile',
            sha256_cert_fingerprints: ['long sha256 fingerprint 62:BF:C1:78...']
          }
        },
        {
          relation: [
            'delegate_permission/common.handle_all_urls'
          ],
          target: {
            namespace: 'android_app',
            package_name: 'org.medicmobile.other.app',
            sha256_cert_fingerprints: ['long other sha256 fingerprint 26:FB:1C:87...']
          }
        },
      ]);
    });

    it('returns true for assetlinks with multiple apk fingerprints', () => {
      isValid([{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'org.medicmobile.webapp.mobile',
          sha256_cert_fingerprints: [
            'long sha256 fingerprint 62:BF:C1:78...',
            'long other sha256 fingerprint 26:FB:1C:87...',
          ],
        }
      }]);
    });

    it('returns false for an empty assetlinks', () => {
      isNotValid([], '"value" must contain at least 1 items');
    });

    it('returns false for assetlinks with constant properties that were changed', () => {
      isNotValid(
        [{
          relation: ['something wrong'],
          target: {
            namespace: 'android_app',
            package_name: 'org.medicmobile.webapp.mobile',
            sha256_cert_fingerprints: ['long sha256 fingerprint 62:BF:C1:78...']
          }
        }],
        '"[0].relation[0]" must be [delegate_permission/common.handle_all_urls]',
      );

      isNotValid(
        [{
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'something else',
            package_name: 'org.medicmobile.webapp.mobile',
            sha256_cert_fingerprints: ['long sha256 fingerprint 62:BF:C1:78...']
          }
        }],
        '"[0].target.namespace" must be [android_app]',
      );
    });

    it('returns false for assetlinks with missing properties', () => {
      isNotValid(
        [{
          target: {
            namespace: 'android_app',
            package_name: 'org.medicmobile.webapp.mobile',
            sha256_cert_fingerprints: ['long sha256 fingerprint 62:BF:C1:78...']
          }
        }],
        '"[0].relation" is required',
      );

      isNotValid(
        [{ relation: ['delegate_permission/common.handle_all_urls'] }],
        '"[0].target" is required',
      );

      isNotValid(
        [{
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            package_name: 'org.medicmobile.webapp.mobile',
            sha256_cert_fingerprints: ['long sha256 fingerprint 62:BF:C1:78...']
          }
        }],
        '"[0].target.namespace" is required',
      );

      isNotValid(
        [{
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            sha256_cert_fingerprints: ['long sha256 fingerprint 62:BF:C1:78...']
          }
        }],
        '"[0].target.package_name" is required',
      );

      isNotValid(
        [{
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: 'org.medicmobile.webapp.mobile',
          }
        }],
        '"[0].target.sha256_cert_fingerprints" is required',
      );
    });
  });
});
