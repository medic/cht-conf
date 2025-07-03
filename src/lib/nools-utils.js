const minify = js => js.split('\n')
  .map(s => s.trim().replace(/\s*\/\/.*/, '')) // single-line comments (like this one)
  .join('')
  .replace(/\s*\/\*(?:(?!\*\/).)*\*\/\s*/g, '') /* this kind of comment */
  .replace(/function \(/g, 'function('); // different node versions do function.toString() differently :\

/* eslint-disable max-len */
const addBoilerplateToCode = code => `define Target { _id: null, contact: null, deleted: null, type: null, pass: null, date: null, groupBy: null }
define Contact { contact: null, reports: null, tasks: null }
define Task { _id: null, deleted: null, doc: null, contact: null, icon: null, date: null, readyStart: null, readyEnd: null, title: null, fields: null, resolved: null, priority: null, priorityLabel: null, reports: null, actions: null }
rule GenerateEvents {
  when { c: Contact } then { ${code} }
}`;
/* eslint-enable max-len */

module.exports = {
  addBoilerplateToCode,
  minify,
};
