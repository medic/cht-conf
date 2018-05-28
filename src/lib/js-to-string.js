function toS(o) {
  if(Array.isArray(o)) {
    let s = '[';
    o.forEach(i => s += toS(i) + ',');
    return withoutTrailingComma(s) + ']';
  }
  switch(typeof o) {
    case 'function':
      throw new Error('This function does not support functions!');
    case 'object':
      return oToS(o);
    default:
      return JSON.stringify(o);
  }
}

function oToS(o) {
  let s = '{';
  Object.keys(o).forEach(k => {
    let val = o[k];
    if(typeof val === 'function') {
      if(val.name && val.name !== k) {
        val = val.name;
      } else {
        val = val.toString();
      }
    } else {
      val = toS(val);
    }
    s += `${k}:${val},`;
  });
  return withoutTrailingComma(s) + '}';
}

const withoutTrailingComma = s => s.slice(0, s.length-1);

module.exports = toS;
