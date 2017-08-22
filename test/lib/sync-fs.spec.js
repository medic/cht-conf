const _ = require('lodash');
const assert = require('chai').assert;

const fs = require('../../src/lib/sync-fs');

describe('sync-fs', () => {

  describe('#withoutExtension()', () => {

    _.forEach({
      'person.xml': 'person',
      'person.abc.xml': 'person.abc',
    }, (expected, input) => {

      it(`should convert ${input} to ${expected}`, () => {

        assert.equal(fs.withoutExtension(input), expected);

      });

    });

  });

});
