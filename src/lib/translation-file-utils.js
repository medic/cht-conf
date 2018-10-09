const fs = require('./sync-fs');

function propertiesAsObject(path) {
  const vals = {};
  fs.read(path)
	.split('\n')
	.filter(line => line.includes('='))
	.map(line => line.split(/=(.*)/).map(it => it.trim()).filter(it => it))
	.map(([k, v]) => vals[k] = v);
  return vals;
}

function mergeProperties(doc, props) {
  if(!doc.values) doc.values = {};

  for(const k in props) {
	if(props.hasOwnProperty(k)) doc.values[k] = props[k];
  }

  return doc;
}

function newDocFor(fileName) {
  const id = idFor(fileName);

  return {
	_id: id,
	type: 'translations',
	code: id.substring(id.indexOf('-') + 1),
	name: 'TODO: please ask admin to set this in settings UI',
	enabled: true,
  };
}

function idFor(fileName) {
  return fileName.substring(0, fileName.length - 11);
}

module.exports = {
		propertiesAsObject,
		mergeProperties,
		newDocFor,
		idFor
};
