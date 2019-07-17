const { assert } = require('chai');
const rewire = require('rewire');

const emitter = rewire('../../src/contact-summary/contact-summary-emitter');

describe('contact-summary-emitter', function() {
  describe('test-setup', function() {
    it('should provide the lib', function() {
      // given
      const lib = emitter({ cards:[], fields:[] });

      // expect
      assert.isNotNull(lib);
    });
  });

  describe('isReportValid', function() {
    const isReportValid = emitter.__get__('isReportValid');
    it('should return true if report has no errors property (as for xforms)', function() {
      assert.isTrue(isReportValid({}));
    });

    it('should return true if report has empty errors array (as for JSON forms)', function() {
      assert.isTrue(isReportValid({ errors:[] }));
    });

    it('should return false if report has errors', function() {
      assert.isFalse(isReportValid({ errors:['???'] }));
    });
  });
});
