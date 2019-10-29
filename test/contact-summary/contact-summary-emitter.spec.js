const { assert, expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const emitter = rewire('../../src/contact-summary/contact-summary-emitter');

describe('contact-summary-emitter', function() {
  describe('test-setup', function() {
    it('should provide the lib', function() {
      // given
      const lib = emitter({ cards: [], fields: [] });

      // expect
      assert.isNotNull(lib);
    });
  });

  describe('cards', () => {
    it('cards is empty when appliesIf yields false', () => {
      const appliesIf = sinon.stub().returns(false);
      const cards = [
        { appliesIf },
        { appliesIf, appliesToType: 'report' },
      ];
      const report = { report: true };
      const actual = emitter({ cards }, {}, [report]);

      expect(actual).to.deep.eq({ fields: [], cards: [], context: {} });
      expect(appliesIf.args[0]).to.deep.eq([undefined]);
      expect(appliesIf.args[1]).to.deep.eq([report]);
    });

    it('allows appliesToType to be an array', () => {
      const appliesIf = sinon.stub().returns(false);
      const cards = [
        { appliesIf, appliesToType: ['report'] },
      ];
      const report = { report: true };
      emitter({ cards }, {}, [report]);

      expect(appliesIf.args[0]).to.deep.eq([report]);
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
