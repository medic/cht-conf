const { assert } = require('chai');

const { runContactSummaryLib } = require('../run-lib');

describe('contact-summary lib', function() {
  describe('test-setup', function() {
    it('should provide the lib', function() {
      // given
      const lib = runContactSummaryLib({ cards:[], fields:[] });

      // expect
      assert.isNotNull(lib);
    });
  });

  describe('isReportValid', function() {
    it('should return true if report has no errors property (as for xforms)', function() {
      // given
      const lib = runContactSummaryLib({ cards:[], fields:[] });

      // expect
      assert.isTrue(lib.isReportValid({}));
    });

    it('should return true if report has empty errors array (as for JSON forms)', function() {
      // given
      const lib = runContactSummaryLib({ cards:[], fields:[] });

      // expect
      assert.isTrue(lib.isReportValid({ errors:[] }));
    });

    it('should return false if report has errors', function() {
      // given
      const lib = runContactSummaryLib({ cards:[], fields:[] });

      // expect
      assert.isFalse(lib.isReportValid({ errors:['???'] }));
    });
  });
});
