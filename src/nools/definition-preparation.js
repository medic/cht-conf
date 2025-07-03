/*
Declarative tasks and targets (the elements exported by partner task.js and target.js files), 
are complex objects containing functions. 
Definition-preparation.js binds a value for `this` in all the functions within a definition. 
This fascilitates simple data sharing between functions, and allows function logic to reference the definition itself.
*/

function prepare(definition) {
  const targetContext = {};
  bindAllFunctionsToContext(definition, targetContext);
  targetContext.definition = deepCopy(definition);
}

function bindAllFunctionsToContext(obj, context) {
  const keys = Object.keys(obj);
  for (const i in keys) {
    if (!Object.hasOwn(obj, keys[i])) {
      continue;
    }
    const key = keys[i];
    switch (typeof obj[key]) {
    case 'object':
      bindAllFunctionsToContext(obj[key], context);
      break;
    case 'function':
      obj[key] = obj[key].bind(context);
      break;
    }
  }
}

function deepCopy(obj) {
  const copy = Object.assign({}, obj);
  const keys = Object.keys(copy);
  for (const i in keys) {
    if (!Object.hasOwn(obj, keys[i])) {
      continue;
    }
    const key = keys[i];
    if (Array.isArray(copy[key])) {
      copy[key] = copy[key].slice(0);
      for (let j = 0; j < copy[key].length; ++j) {
        if (typeof copy[key][j] === 'object') {
          copy[key][j] = deepCopy(copy[key][j]);
        }
      }
    } else if (typeof copy[key] === 'object') {
      copy[key] = deepCopy(copy[key]);
    }
  }
  return copy;
}

module.exports = prepare;
