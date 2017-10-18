const csvParse = require('csv-parse/lib/sync');
const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const stringify = require('canonical-json/index2');
const trace = require('../lib/log').trace;
const uuid5 = require('uuid/v5');
const warn = require('../lib/log').warn;

require('../lib/polyfill');

module.exports = projectDir => {
  const couchUrlUuid = uuid5('http://medicmobile.org/configurer/csv-to-docs/permanent-hash', uuid5.URL);

  const csvDir = `${projectDir}/csv`;
  if(!fs.exists(csvDir)) {
    warn(`No csv directory found at ${csvDir}.`);
    return Promise.resolve();
  }

  const jsonDir = `${projectDir}/json_docs`;
  fs.mkdir(jsonDir);

  const saveJsonDoc = doc => fs.writeJson(`${jsonDir}/${doc._id}.doc.json`, doc);

  const model = {
    docs: {},
    references: [],
  };
  const addToModel = docs => {
    docs.forEach(doc => {
      model.docs[doc._id] = doc;
      if(!model[doc.type]) model[doc.type] = [];
      model[doc.type].push(doc);
    });
  };

  return fs.recurseFiles(csvDir)
    .filter(name => name.endsWith('.csv'))
    .reduce((promiseChain, csv) =>
        promiseChain
          .then(() => {
            info('Processing CSV file:', csv, '…');

            const nameParts = fs.path.basename(csv).split('.');
            const prefix = nameParts[0];
            switch(prefix) {
              case 'person': return processPersons(csv);
              case 'place':  return processPlaces(csv);
              case 'report': return processReports(nameParts[1], csv);
              default: throw new Error(`Unrecognised CSV type ${prefix} for file ${csv}`);
            }
          })
          .then(addToModel),
      Promise.resolve())

    .then(() => {
      model.references.forEach(ref => {
        setCol(ref.doc, ref.property, model[ref.type][ref.index]._id);
      });
    })

    .then(() => trace('Should now create all files for docs:', JSON.stringify(model, null, 2)))
    .then(() => Promise.all(Object.values(model.docs).map(saveJsonDoc)));


  function withId(json) {
    const id = uuid(json);
    json._id = id;
    return json;
  }

  function loadCsv(csv) {
    const raw = csvParse(fs.read(csv));
    if(!raw.length) return { cols:[], rows:[] };
    return {
      cols: raw[0],
      rows: raw.slice(1),
    };
  }

  function processPersons(csv) {
    return processContacts('person', csv);
  }

  function processPlaces(csv) {
    const placeType = fs.path.basename(csv).split('.')[1];
    return processContacts(placeType, csv);
  }

  function processReports(report_type, csv) {
    const { rows, cols } = loadCsv(csv);
    return rows
      .map(r => processCsv('report', cols, r, { form:report_type }));
  }

  function processContacts(contactType, csv) {
    const { rows, cols } = loadCsv(csv);
    return rows
      .map(r => processCsv(contactType, cols, r));
  }

  function processCsv(docType, cols, row, baseDoc) {
    const doc = baseDoc || {};
    doc.type = docType;

    function addReference(r) {
      r.doc = doc;
      model.references.push(r);
    }

    for(let i=0; i<cols.length; ++i) {
      const { col, val, references } = parseColumn(cols[i], row[i]);
      setCol(doc, col, val);
      references.forEach(addReference);
    }

    return withId(doc);
  }

  function uuid(json) {
    return uuid5(stringify(json), couchUrlUuid);
  }

  function parseColumn(rawCol, rawVal) {
    let col, val;
    const references = [];

    const parts = rawCol.split(':');

    if(parts.length === 1) {
      col = rawCol;
      val = rawVal;
    } else if(parts.length === 2) {
      const type = parts[0];
      col = parts[1];
      switch(type) {
        case 'date': val = new Date(rawVal); break;
        case 'int': val = Number.parseInt(rawVal, 10); break;
        case 'bool': val = rawVal.toLowerCase() === 'true'; break;
        default: throw new Error(`Unrecognised column type: ${type} for ${rawCol}`);
      }
    } else if(parts.length === 3) {
      if(parts[0] !== 'csv') throw new Error(`Unrecognised column type: ${rawCol}`);

      col = parts[2];

      const refIdx = -1 + Number.parseInt(rawVal, 10);

      references.push({
        property: col,
        type: parts[1],
        index: refIdx,
      });

      // We still need to return a value here so that the object will be unique
      // when compared with another object which is identical except for one or
      // more reference values.  E.g.
      // { name:'alice', parent:ref1 } vs { name:'alice', parent:ref2 }
      val = rawVal;
    } else {
      throw new Error(`Too many colons in column name: ${rawCol}`);
    }

    return { col:col, val:val, references:references };
  }
};

function setCol(doc, col, val) {
  const colParts = col.split('.');
  while(colParts.length > 1) {
    col = colParts.shift();
    if(!doc[col]) doc[col] = {};
    doc = doc[col];
  }
  doc[colParts[0]] = val;
}
