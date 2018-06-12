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
      assert.equal(compiled, 'var context,fields,cards;function isReportValid(e){return e&&!(e.errors&&e.errors.length)}var result={cards:[],fields:fields.filter(function(e){if((e.appliesToType===contact.type||\'!\'===e.appliesToType.charAt(0)&&e.appliesToType.slice(1)!==contact.type)&&(!e.appliesIf||e.appliesIf()))return delete e.appliesToType,delete e.appliesIf,!0})};function addCard(e,a){if(e.appliesIf(a)){var t=\'function\'==typeof e.fields?e.fields(a):e.fields.filter(function(e){switch(typeof e.appliesIf){case\'undefined\':return!0;case\'function\':return e.appliesIf(a);default:return e.appliesIf}}).map(function(e){var t={};return r(e,t,\'label\'),r(e,t,\'value\'),r(e,t,\'translate\'),r(e,t,\'filter\'),r(e,t,\'width\'),r(e,t,\'icon\'),e.context&&(t.context={},r(e.context,t.context,\'count\'),r(e.context,t.context,\'total\')),t});result.cards.push({label:e.label,fields:t}),e.modifyContext&&e.modifyContext(context,a)}function r(e,t,r){switch(typeof e[r]){case\'undefined\':return;case\'function\':t[r]=e[r](a);break;default:t[r]=e[r]}}}return cards.forEach(function(e){var t,r;switch(e.appliesToType){case\'report\':for(t=0;t<reports.length;++t)isReportValid(r=reports[t])&&addCard(e,r);break;default:if(contact.type!==e.appliesToType)return;addCard(e)}}),result.context=context,result;');
    });
  });

});
