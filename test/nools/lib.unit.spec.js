const { expect } = require('chai');
const rewire = require('rewire');

describe('nools lib unit tests', () => {
  global.targets = [];
  global.tasks = [];
  global.emit = () => {};
  const lib = rewire('../../src/nools/lib.js');
  
  after(() => {
    delete global.targets;
    delete global.tasks;
    delete global.emit;
  });

  describe('deep copy', () => {
    const deepCopy = lib.__get__('deepCopy');

    it('shallow fields are copied', () => {
      const original = { foo: 'bar' };
      const copy = deepCopy(original);
      expect(copy).to.deep.eq({ foo: 'bar' });
      copy.foo = 'foo';
      expect(original).to.deep.eq({ foo: 'bar' });
    });

    it('deep fields are copied', () => {
      const original = { a: { foo: 'bar' } };
      const copy = deepCopy(original);
      expect(copy).to.deep.eq({ a: { foo: 'bar' } });
      copy.a.foo = 'foo';
      expect(original).to.deep.eq({ a: { foo: 'bar' } });
    });

    it('functions are copied', done => {
      const original = { a: { foo: done } };
      const copy = deepCopy(original);
      copy.a.foo();
    });

    it('handles undefined', () => {
      const copy = deepCopy(undefined);
      expect(copy).to.deep.eq({});
    });
  });

  describe('bindAllFunctionsToContext', () => {
    const bindAllFunctionsToContext = lib.__get__('bindAllFunctionsToContext');

    it('shallow functions are bound', done => {
      const context = { foo: 'bar' };
      const obj = {
        foo: function() {
          expect(this.foo).to.eq('bar');
          expect(this).to.eq(context);
          done();
        },
      };

      bindAllFunctionsToContext(obj, context);
      obj.foo();
    });

    it('deep functions are bound', done => {
      const context = { foo: 'bar' };
      const obj = {
        a: {
          foo: function() {
            expect(this.foo).to.eq('bar');
            expect(this).to.eq(context);
            done();
          },
        },
      };

      bindAllFunctionsToContext(obj, context);
      obj.a.foo();
    });
  });

});
