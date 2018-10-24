const warn = require('../lib/log').warn;

module.exports = (objects, props) => {
  return objects.map(original => {
    const filtered = {};

    if(props.required) props.required.forEach(prop => {
      if(!original.hasOwnProperty(prop)) {
        throw new Error(`missing required property: ${prop} in object:\n${prettyPrint(original)}`);
      }
      cp(original, filtered, prop);
    });

    if(props.recommended) props.recommended.forEach(prop => {
      if(!original.hasOwnProperty(prop)) {
        warn(`missing recommended property: ${prop} in object:\n${prettyPrint(original)}`);
      }
      cp(original, filtered, prop);
    });

    if(props.optional) props.optional.forEach(prop => cp(original, filtered, prop));

    return filtered;
  });
};

function cp(original, filtered, prop) {
  if(original.hasOwnProperty(prop)) filtered[prop] = original[prop];
}

function prettyPrint(o) {
  const content = Object.keys(o).map(k => {
    let val = o[k];

    if(typeof val === 'function') {
      val = val.toString().replace(/{[\s\S]*}/m, '{ ... }');
    } else val = JSON.stringify(val);

    return `          ${k}: ${val},`;
  }).join('\n');
  return '        {\n' + content + '\n        }';
}
