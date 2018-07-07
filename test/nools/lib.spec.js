const assert = require('chai').assert;
const parseJs = require('../../src/lib/simple-js-parser');

describe('contact-summary lib', function() {
  const loadLibWithConfig = ({ c }) => {
    return parseJs({
      jsFiles: [ `${__dirname}/../../src/nools/lib.js` ],
      header: `
          var c = ${JSON.stringify(c)};
          var emitted = {};
          function emit(id, obj) {
            emitted[id] = obj;
          };
          `,
      export: [ 'emitted' ],
    });
  };

  describe('test setup', function() {
    it('should successfully parse the lib', function() {
      // given
      const lib = loadLibWithConfig({ c:{} });

      // expect
      assert.isNotNull(lib);
    });

    it('should emit completed signal', function() {
      // when
      const emitted = loadLibWithConfig({ c:{} }).emitted;

      // then
      assert.deepEqual(emitted, { _complete:{ _id:true } });
    });
  });
});
