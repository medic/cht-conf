/*
Declarative tasks and targets (the elements exported by partner task.js and target.js files), are complex objects containing functions. 
Definition-preparation.js binds a value for `this` in all the functions within a definition. 
This fascilitates simple data sharing between functions, and allows function logic to reference the definition itself.
*/

function prepare(definition, defaultResolvedIf, Utils) {
  var targetContext = {};
  bindAllFunctionsToContext(definition, targetContext);
  targetContext.definition = deepCopy(definition);
  if (defaultResolvedIf) {
    targetContext.defaultResolvedIf = function (contact, report, event, dueDate, resolvingForm) {
      if(!resolvingForm) {
        var reportAction = definition.actions.find(function (action) { return action.type === 'report'; });
        if(!reportAction) {
          throw new Error('Could not find the default resolving form. You need to provide the resolvingForm when using "this.defaultResolvedIf(contact, report, event, dueDate, resolvingForm)"'
            + 'if you don\'t have any action with "type: \'report\'".');
        }
        return defaultResolvedIf(contact, report, event, dueDate, reportAction.form, Utils);
      }
      return defaultResolvedIf(contact, report, event, dueDate, resolvingForm, Utils);
    };

  }
}

function bindAllFunctionsToContext(obj, context) {
  var keys = Object.keys(obj);
  for (var i in keys) {
    var key = keys[i];
    switch(typeof obj[key]) {
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
  var copy = Object.assign({}, obj);
  var keys = Object.keys(copy);
  for (var i in keys) {
    var key = keys[i];
    if (Array.isArray(copy[key])) {
      copy[key] = copy[key].slice(0);
      for (var j = 0; j < copy[key].length; ++j) {
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
