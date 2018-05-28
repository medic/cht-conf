module.exports = code => {
  let lineNumber = 0;
  return code.replace(/^/mg, () => `${++lineNumber}\t`);
};
