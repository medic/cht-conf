const assert = require('chai').assert;
const compileContactSummary = require('../../src/lib/compile-contact-summary');

const BASE_DIR = 'data/compile-contact-summary';

describe('compile-contact-summary', function() {

  it('should throw an error if no recognised file layout is found', function() {
    try {

      // when
      compileContactSummary(`${BASE_DIR}/empty`);

      assert.fail('Expected error to be thrown.');

    } catch(e) {
      if(e.name === 'AssertionError') throw e;
      // else expected :¬)
    }
  });

  describe('with contact-summary.js', function() {

    it('should include a simple file verbatim', function() {
      // when
      const compiled = compileContactSummary(`${BASE_DIR}/verbatim`);

      // then
      assert.equal(compiled, 'contact.x=\'a string\';');
    });

    it('should include other source file referenced with __include_inline__()', function() {
      // when
      const compiled = compileContactSummary(`${BASE_DIR}/includes`);

      // then
      assert.equal(compiled, 'contact.x=\'from original\',contact.y=\'from included\';');
    });

  });

});
