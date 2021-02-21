const { assert, expect } = require('chai');
const failPromiseChain = require('../../src/lib/fail-promise-chain');

describe('fail-promise-chain', () => {

  let callCount = 0;
  function callCounter() { callCount++; }

  afterEach(() => {
    callCount = 0;
  });

  describe('failPromiseChain', () => {
    it('abort at the end of the chain as expected with one call', () => {
      const promiseChain = new Promise(resolve => {
        callCounter();
        resolve();
      })
      .then(callCounter)
      .then(callCounter);

      return failPromiseChain(promiseChain, 'The final message')
        .then(() => assert.fail('Expected chain to fail'))
        .catch(err => {
          expect(err.message).to.eq('The final message');
          expect(callCount).to.eq(3);
        });
    });

    it('abort at the end of the chain as expected with more than one call', () => {
      let promiseChain = new Promise((resolve) => {
        callCounter();
        resolve();
      })
      .then(callCounter)
      .then(callCounter);

      promiseChain = failPromiseChain(promiseChain, 'The final message 1');
      promiseChain = failPromiseChain(promiseChain, 'The final message 2');
      promiseChain = failPromiseChain(promiseChain, 'The final message 2'); // again

      return promiseChain
        .then(() => assert.fail('Expected chain to fail'))
        .catch(err => {
          expect(err.message).to.eq(
            'The final message 1\nThe final message 2');    // Only the first is thrown
          expect(callCount).to.eq(3);                       // But all the promises
        });
    });
  });
});