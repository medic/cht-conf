module.exports = (...args) => logAtLevel('TRACE', ...args);
module.exports.error = (...args) => logAtLevel('ERROR', ...args);
module.exports.info = (...args) => logAtLevel('INFO', ...args);
module.exports.trace = module.exports;
module.exports.warn = (...args) => logAtLevel('WARN', ...args);

function logAtLevel(level, ...args) {
  args.unshift(level);
  console.log.apply(console.log, args);
}
