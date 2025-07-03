const warn = require('./log').warn;

module.exports = reason => {
  const fnName = new Error().stack.split('\n')
    .filter(s => s.includes('fn'))[1]
    .match('/fn/([a-z-]+)\.js')[1];  

  let warning = `Skipping action: ${fnName}`;
  if (reason) {
    warning += ` (${reason})`;
  }
  warn(warning);

  return Promise.resolve();
};
