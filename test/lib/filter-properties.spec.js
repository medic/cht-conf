const assert = require('chai').assert;

const filterProperties = require('../../src/lib/filter-properties');

describe('filter-properties', () => {
  // GOOD inputs
  [
    {
      description: 'no props, empty input',
      input: [],
      props: {},
      expectedOutput: [],
    },
    {
      description: 'optional only, single input',
      input: [ { a:1, b:2 } ],
      props: { optional:[ 'a', 'b' ] },
      expectedOutput: [ { a:1, b:2 } ],
    },
    {
      description: 'required only, single input',
      input: [ { a:1, b:2 } ],
      props: { required:[ 'a', 'b' ] },
      expectedOutput: [ { a:1, b:2 } ],
    },
    {
      description: 'allow recommended',
      input: [ { a:1, b:2, c:3 } ],
      props: { required:[ 'a' ], optional:[ 'b' ], recommended:[ 'c' ] },
      expectedOutput: [ { a:1, b:2, c:3 } ],
    },
    {
      description: 'filter unlisted',
      input: [ { a:1, b:2, c:3 } ],
      props: { required:[ 'a' ], optional:[ 'b' ] },
      expectedOutput: [ { a:1, b:2 } ],
    },
  ].forEach(testCase => {
    it(`should convert OK input '${testCase.description}' successfully`, () =>
        assert.deepEqual(
            filterProperties(testCase.input, testCase.props),
            testCase.expectedOutput));
  });

  // BAD inputs
  [
    {
      description: 'missing required',
      input: [ {} ],
      props: { required:[ 'a' ] },
    },
  ].forEach(testCase => {
    it(`should throw Error for '${testCase.description}'`, () =>
        assert.throws(() => filterProperties(testCase.input, testCase.props)));
  });
});
