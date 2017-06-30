module.exports = (...args) => logAtLevel('TRACE', ...args);
module.exports.error = (...args) => logAtLevel('ERROR', ...args);
module.exports.info = (...args) => logAtLevel('INFO', ...args);
module.exports.trace = module.exports;
module.exports.warn = (...args) => logAtLevel('WARN', ...args);

function logAtLevel(level, ...args) {
  args.unshift(level);
  console.log.apply(console.log, args.map(redactUrls));
}

const redactUrls = s => {
  if(s && typeof s !== 'string') s = JSON.stringify(s);
  return s && s.replace(/(http[s]?:\/\/[^:]*):[^@]*@/g, '$1:****@');
};
