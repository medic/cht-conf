const { assert } = require('chai');
const rewire = require('rewire');
global.fields = [];
global.cards = [];
const lib = rewire('../../src/contact-summary/lib');

describe('contact-summary lib', () => {
  after(() => {
    delete global.fields;
    delete global.cards;
  });

  describe('isReportValid', () => {
    const isReportValid = lib.__get__('isReportValid');

    it('should return true if report has no errors property (as for xforms)', () => {
      // expect
      assert.isTrue(isReportValid({}));
    });

    it('should return true if report has empty errors array (as for JSON forms)', () => {
      // expect
      assert.isTrue(isReportValid({ errors:[] }));
    });

    it('should return false if report has errors', () => {
      // expect
      assert.isFalse(isReportValid({ errors:['???'] }));
    });
  });
});
