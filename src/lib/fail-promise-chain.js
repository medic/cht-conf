/**
 * Add to the promise chain a promise at the end that raise
 * an `Error` exception with the fail message passed.
 *
 * If the method is called more than one time with the same
 * promise chain, only one failed promise will be added
 * to the promise chain, with all the unique `failMessage`
 * strings concatenated in the error message.
 *
 * @param {Promise} promiseChain the chain of promises
 * @param {string} failMessage a message to explain why the
 *        chain is failed at the end
 * @returns {Promise} the same promise chain with the
 *          failed promise appended
 */
module.exports = (promiseChain, failMessage) => {
  return promiseChain
    .catch(err => err.message ? err.message : err)
    .then(errMsg => {
      if (errMsg) {
        if (errMsg.indexOf(failMessage) < 0) {
          // only unique fail messages are added
          // to the summarized error exception
          // thrown at the end of the chain
          errMsg += '\n' + failMessage;
        }
        throw new Error(errMsg);
      }
      throw new Error(failMessage);
    });
};
