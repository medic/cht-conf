const { assert, expect } = require('chai');
const path = require('path');
const compileContactSummary = require('../../src/lib/compile-contact-summary');

const BASE_DIR = path.join(__dirname, '../data/compile-contact-summary');

const options = { minifyScripts: true };

describe('compile-contact-summary', () => {
  it('should throw an error if no recognised file layout is found', async () => {
    try {
      // when
      await compileContactSummary(`${BASE_DIR}/empty`, options);
      assert.fail('Expected error to be thrown.');
    } catch(e) {
      if(e.name === 'AssertionError') throw e;
      // else expected :¬)
    }
  });

  describe('with contact-summary.js', () => {
    it('should include a simple file verbatim', async () => {
      // when
      const compiled = await compileContactSummary(`${BASE_DIR}/verbatim`, options);

      // then
      expect(compiled).to.include('contact.x=\'a string\'');
    });

    it('should include other source file referenced with require', async () => {
      // when
      const compiled = await compileContactSummary(`${BASE_DIR}/includes`, options);

      // then
      expect(compiled).to.include('contact.x=\'from original\'');
      expect(compiled).to.include('contact.y=\'from included\'');
    });
  });
});
