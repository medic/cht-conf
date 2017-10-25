const csvParse = require('csv-parse/lib/sync');
const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const stringify = require('canonical-json/index2');
const trace = require('../lib/log').trace;
const uuid5 = require('uuid/v5');
const warn = require('../lib/log').warn;

const pretty = o => JSON.stringify(o, null, 2);

const RESERVED_COL_NAMES = [ 'type', 'form' ];

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
    csvFiles: {},
    docs: {},
    references: [],
  };
  const addToModel = (csvFile, docs) => {
    csvFile = csvFile.match(/^(?:.*[\/\\])?csv[\/\\](.*)\.csv$/)[1];
    model.csvFiles[csvFile] = docs;
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
          .then(docs => addToModel(csv, docs)),
      Promise.resolve())

    .then(() => model.references.forEach(updateRef))

    .then(() => trace('Should now create all files for docs:', pretty(model)))
    .then(() => Promise.all(Object.values(model.docs).map(saveJsonDoc)));


  function updateRef(ref) {
    let referencedDoc;

    switch(ref.refType) {
      case 'csv':
        if(!model.csvFiles[ref.sourceFile])
          throw new Error(`Cannot find referenced CSV file: ${projectDir}/csv/${ref.sourceFile}.csv`);
        referencedDoc = model.csvFiles[ref.sourceFile][ref.rowIdx-1];
        break;
      case 'match':
        referencedDoc = Object.values(model.docs)
            .find(doc => doc[ref.colName] === ref.colVal &&
                Object.keys(ref.matchers)
                    .every(col => doc[col] === ref.matchers[col]));
        if(!referencedDoc) warn(`Couldn't find doc for ref ${pretty(ref)}`);
        break;
      default: throw new Error(`Don't know how to handle ref of type: ${ref.refType}:\n${pretty(ref)}`);
    }

    let finalVal;
    if(ref.expandTo === 'doc') {
      finalVal = referencedDoc;
    } else if(ref.expandTo === 'id') {
      finalVal = { _id:referencedDoc._id };
    } else if(ref.expandTo.startsWith('.')) {
      let prop;
      const props = ref.expandTo.substring(1).split('.');
      finalVal = referencedDoc;
      while((prop = props.shift())) finalVal = finalVal[prop];
    } else throw new Error(`Don't know how to expand reference to value:\n${pretty(ref)}`);

    setCol(ref.doc, ref.targetProperty, finalVal);
  }

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
      .map(r => processCsv('data_record', cols, r, { form:report_type }));
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

    const parts = rawCol.split(/[:>]/);

    if(parts.length === 1) {
      col = rawCol;
      val = rawVal;
    } else if(parts.length === 2) {
      const type = parts[0];
      col = parts[1];
      switch(type) {
        case 'date': val = new Date(rawVal); break;
        case 'timestamp': val = new Date(rawVal).getTime(); break;
        case 'int': val = Number.parseInt(rawVal, 10); break;
        case 'bool': val = rawVal.toLowerCase() === 'true'; break;
        default: throw new Error(`Unrecognised column type: ${type} for ${rawCol}`);
      }
    } else if(parts.length === 4) {
      // We still need to return a value here so that the object will be unique
      // when compared with another object which is identical except for one or
      // more reference values.  E.g.
      // { name:'alice', parent:ref1 } vs { name:'alice', parent:ref2 }
      val = rawVal;

      if(parts[0] === 'csv') {
        col = parts[3];

        references.push({
          refType: 'csv',
          sourceFile: parts[1],
          rowIdx: rawVal,
          expandTo: parts[2],
          targetProperty: col,
        });
      } else if(parts[0].startsWith('match=')) {
        col = parts[3];

        // split a=1&b=2&c=3 into { a:1, b:2, c:3 }
        const matchers = {};
        parts[1].split('&')
            .map(pair => pair.split('='))
            .forEach(p => matchers[p[0]] = p[1]);

        references.push({
          refType: 'match',
          matchers: matchers,
          colName: parts[0].split('=')[1],
          colVal: rawVal,
          expandTo: parts[2],
          targetProperty: col,
        });
      } else {
        throw new Error(`Unrecognised column definition: ${rawCol} (expected: "csv:…" or "match=…"`);
      }
    } else {
      throw new Error(`Wrong number of parts in column definition: ${rawCol} (should be 1, 2 or 4, but found ${parts.length}).`);
    }

    return { col:col, val:val, references:references };
  }
};

function setCol(doc, col, val) {
  const colParts = col.split('.');

  if(RESERVED_COL_NAMES.includes(colParts[0]))
    throw new Error(`Cannot set property defined by column '${col}' - this property name is protected.`);

  while(colParts.length > 1) {
    col = colParts.shift();
    if(!doc[col]) doc[col] = {};
    doc = doc[col];
  }
  doc[colParts[0]] = val;
}
