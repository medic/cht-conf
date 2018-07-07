const assert = require('chai').assert;

const jsToString = require('../../src/lib/js-to-string');

describe('jsToString', function() {
  describe('String handling', function() {
    it('should handle a simple string', function() {
      // expect
      assert.equal(jsToString('a simple string'), '"a simple string"');
    });
    it('a string with quotes', function() {
      // given
      const input = 'a "string" with \'quotes\'';
      const expected = '"a \\"string\\" with \'quotes\'"';

      // expect
      assert.equal(jsToString(input), expected);
    });
    it('should handle a string with linebreaks', function() {
      // given
      const input = 'a\nstring\nwith\nlinebreaks\n';
      const expected = '"a\\nstring\\nwith\\nlinebreaks\\n"';

      // expect
      assert.equal(jsToString(input), expected);
    });
  });

  describe('Number handling', function() {
    it('should handle zero', function() {
      // expect
      assert.equal(jsToString(0), '0');
    });
    it('should handle a positive number', function() {
      // expect
      assert.equal(jsToString(1), '1');
    });
    it('should handle a negative number', function() {
      // expect
      assert.equal(jsToString(-1), '-1');
    });
  });

  describe('Array handling', function() {
    it('should handle empty array', function() {
      // expect
      assert.equal(jsToString([]), '[]');
    });
    it('should handle array with one entry', function() {
      // expect
      assert.equal(jsToString([1]), '[1]');
    });
    it('should handle array with multiple entries', function() {
      // expect
      assert.equal(jsToString([1, 2, 3]), '[1,2,3]');
    });
  });

  describe('Object handling', function() {
    it('should handle empty object', function() {
      // expect
      assert.equal(jsToString({}), '{}');
    });
    it('should handle object with one property', function() {
      // expect
      assert.equal(jsToString({ a:1 }), '{a:1}');
    });
    it('should handle object with multiple properties', function() {
      // expect
      assert.equal(jsToString({ a:1, b:2, c:3 }), '{a:1,b:2,c:3}');
    });
  });

  describe('Function handling', function() {
    it('should not handle a simple function', function() {
      try {
        // when
        jsToString(function() {});
        assert.isNotOk('should have thrown :(');
      } catch(e) {
        // then
        assert.equal(e.message, 'This function does not support functions!');
      }
    });
    it('should not handle a named function', function() {
      try {
        // when
        jsToString(function withName() {});
        assert.isNotOk('should have thrown :(');
      } catch(e) {
        // then
        assert.equal(e.message, 'This function does not support functions!');
      }
    });
    it('should not handle a function which does something', function() {
      try {
        // when
        jsToString(function(a, b) { return a + b; });
        assert.isNotOk('should have thrown :(');
      } catch(e) {
        // then
        assert.equal(e.message, 'This function does not support functions!');
      }
    });
  });
});
