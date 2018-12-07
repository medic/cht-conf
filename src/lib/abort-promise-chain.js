module.exports = (promiseChain, message) =>
  promiseChain.then(() => {
    throw new Error(message);
  });
