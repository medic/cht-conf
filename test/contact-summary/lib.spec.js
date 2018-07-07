const assert = require('chai').assert;
const parseJs = require('../../src/lib/simple-js-parser');

describe('contact-summary lib', function() {
  const loadLibWithConfig = ({ cards, fields }) => parseJs({
        jsFiles: [ `${__dirname}/../../src/contact-summary/lib.js` ],
        header: `var fields = ${JSON.stringify(fields)};` +
                `var cards = ${JSON.stringify(cards)};`,
        trimLinesFromEnd: 3,
      },
      'isReportValid',
      'result');

  describe('test-setup', function() {
    it('should provide the lib', function() {
      // given
      const lib = loadLibWithConfig({ cards:[], fields:[] });

      // expect
      assert.isNotNull(lib);
    });
  });

  describe('isReportValid', function() {
    it('should return true if report has no errors property (as for xforms)', function() {
      // given
      const lib = loadLibWithConfig({ cards:[], fields:[] });

      // expect
      assert.isTrue(lib.isReportValid({}));
    });

    it('should return true if report has empty errors array (as for JSON forms)', function() {
      // given
      const lib = loadLibWithConfig({ cards:[], fields:[] });

      // expect
      assert.isTrue(lib.isReportValid({ errors:[] }));
    });

    it('should return false if report has errors', function() {
      // given
      const lib = loadLibWithConfig({ cards:[], fields:[] });

      // expect
      assert.isFalse(lib.isReportValid({ errors:['???'] }));
    });
  });
});
