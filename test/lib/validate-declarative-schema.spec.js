const { expect } = require('chai');
const joi = require('@hapi/joi');
const rewire = require('rewire');

const validateDeclarativeSchema = rewire('../../src/lib/validate-declarative-schema');

describe('validate-declarative-schema', () => {
  describe('validate', () => {
    const validate = (...args) => validateDeclarativeSchema.__get__('validate')('desc', ...args);

    it('array.unique', () => {
      const schema = joi.array().items(joi.object()).unique('name');
      const actual = validate([{ name: 'a' }, { name: 'a' }], schema);
      expect(actual).to.deep.eq(['desc[1] contains duplicate value for the "name" field: "a"']);
    });

    it('array.unique internal', () => {
      const schema = joi.array().items(joi.object({
        event: joi.array().items(joi.object()).unique('id'),
      }));
      const actual = validate([{ event: [{ id: 'x' }, { id: 'x' }] }], schema);
      expect(actual).to.deep.eq(['desc[0].event[1] contains duplicate value for the "id" field: "x"']);
    });

    it('custom errors', () => {
      const schema = joi.array().items(
        joi.object({
          priority: joi.object().required().error(new Error('custom error'))
        })
      ).required();
      const actual = validate([{ priority: 'high' }], schema);
      expect(actual).to.deep.eq(['custom error']);
    });

    it('string set', () => {
      const schema = joi.string().valid('contacts', 'reports', 'scheduled_tasks').required();
      const actual = validate('no', schema);
      expect(actual).to.deep.eq(['"value" must be one of [contacts, reports, scheduled_tasks]. Value is: "no"']);
    });
  });
});
