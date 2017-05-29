module.exports = (...args) => logAtLevel('INFO', ...args);
module.exports.info = module.exports;
module.exports.warn = (...args) => logAtLevel('WARN', ...args);

function logAtLevel(level, ...args) {
  args.unshift(level);
  console.log.apply(console.log, args);
}
