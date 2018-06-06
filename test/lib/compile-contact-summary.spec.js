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
      // expected :¬)
    }
  });

  describe('with contact-summary.js', function() {

    it('should include a simple file verbatim', function() {
      // when
      const compiled = compileContactSummary(`${BASE_DIR}/verbatim`);

      // then
      assert.equal(compiled, '\'a javascript string\';');
    });

    it('should include other source file referenced with __include_inline__()', function() {
      // when
      const compiled = compileContactSummary(`${BASE_DIR}/includes`);

      // then
      assert.equal(compiled, '\'original\';\'included\';');
    });

  });

  describe('with template', function() {

    it('should include the user-supplied code with template header and footer', function() {
      // when
      const compiled = compileContactSummary(`${BASE_DIR}/templated`);

      // then
      assert.equal(compiled, 'var context,fields,cards;function isReportValid(e){return e&&!(e.errors&&e.errors.length)}var result={cards:[],fields:fields.filter(function(e){if((e.appliesToType===contact.type||\'!\'===e.appliesToType.charAt(0)&&e.appliesToType.slice(1)!==contact.type)&&(!e.appliesIf||e.appliesIf()))return delete e.appliesToType,delete e.appliesIf,!0})};return cards.forEach(function(e){var t,l;switch(e.appliesToType){case\'report\':for(t=0;t<reports.length;++t)isReportValid(l=reports[t])&&e.appliesIf(l)&&(result.cards.push({label:e.label,fields:e.fields(l)}),e.modifyContext&&e.modifyContext(context));break;default:if(contact.type!==e.appliesToType)return;e.appliesIf()&&(result.cards.push({label:e.label,fields:e.fields()}),e.modifyContext&&e.modifyContext(context))}}),result.context=context,result;');
    });
  });

});
