const minimist = require('minimist');
const stringify = require('canonical-json/index2');
const uuid5 = require('uuid/v5');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const path = require('path');
const { warn, trace, info, error } = require('../lib/log');
const generateCsv = require('../lib/generate-users-csv');
const pouch = require('../lib/db');

const pretty = o => JSON.stringify(o, null, 2);

const RESERVED_COL_NAMES = [ 'type', 'form', '_id' ];


module.exports = ()=> {
  const args = parseExtraArgs(environment.pathToProject, environment.extraArgs);
  const db = pouch();

  const csvDir = `${environment.pathToProject}/csv`;
  if(!fs.exists(csvDir)) {
    warn(`No csv directory found at ${csvDir}.`);
    return Promise.resolve();
  }

  return fs.recurseFiles(csvDir)
    .filter(name => name.endsWith('.csv'))
    .reduce((promiseChain, csv) =>
        promiseChain
          .then(() => {
            info('Processing CSV file:', csv, '…');


            const nameParts = fs.path.basename(csv).split('.');
            const prefix = nameParts[0];
            info('Processing CSV file:', prefix, '…');

            switch(prefix) {
              case 'contact':  return downloadDocs(csv, getIDs(csv),db, args);
              case 'users' :  return processUsers(csv);
              default: throw new Error(`Unrecognised CSV type ${prefix} for file ${csv}`);
            }
          })
          .then(docs => addToModel(csv, docs)),
      Promise.resolve())

    .then(() => model.exclusions.forEach(removeExcludedField))
    .then(() => {
      if(model.users.length) {
        generateCsv(model.users, environment.pathToProject + '/users.csv');
      }
    })
    .then(() => Promise.all(Object.values(model.docs).map(saveJsonDoc)));
};


  const jsonDir = `${environment.pathToProject}/json_docs`;
  fs.mkdir(jsonDir);

  const saveJsonDoc = doc => fs.write(`${jsonDir}/${doc._id}.doc.json`, toSafeJson(doc) + '\n');

  const model = {
    csvFiles: {},
    docs: {},
    references: [],
    exclusions: [],
    users: []
  };

  const addToModel = (csvFile, docs) => {
    csvFile = csvFile.match(/^(?:.*[\/\\])?csv[\/\\](.*)\.csv$/)[1]; // eslint-disable-line no-useless-escape
    model.csvFiles[csvFile] = docs;
    docs.forEach(doc => {
      model.docs[doc._id] = doc;
      if (doc.type === 'user-settings') {
        model.users.push(doc);
      }
    });
  };

  function getIDs(csv) {
    const { rows, cols } = fs.readCsv(csv);
    var index = cols.indexOf('uuid');
   	if (index == -1){
   		throw Error('missing "uuid" column.');
   	}
    return rows.map((item, i) => item[index]);
      // .map(r => processCsv('data_record', cols, r, { form:report_type }));
  }

  function processContacts(contactType, csv, ids, contactDocs, args){
    const { rows, cols } = fs.readCsv(csv);
    var colNames = (args.columns || args.column || '')
    .split(',')
    .filter(id => id);

	if (colNames.length === 0) {
		warn(' No columns specified, the script will add all the columns in the CSV!');
		colNames = cols;
	}
    var index = cols.indexOf('uuid');
    return rows
      .map(r => processCsv(contactType, colNames, r, ids, index, contactDocs));

  }

  // function processUsers(csv){
  //   const { rows, cols } = fs.readCsv(csv);
  //   return rows
  //     .map(r => processCsv('user', cols, r));
  // }

  function processCsv(docType, cols, row, ids, index, contactDocs) {
  	const contactId = row[index];
  	const doc = contactDocs[contactId];
  	cols.filter(arrayItem => arrayItem !== 'uuid');

    for(let i=0; i<cols.length; ++i) {
      const { col, val, reference, excluded } = parseColumn(cols[i], row[i]);
      setCol(doc, col, val);
      if(reference) model.references.push({
        doc: doc,
        matcher: reference,
        colVal: val,
        targetProperty: col,
      });
      if(excluded) model.exclusions.push({
        doc: doc,
        propertyName: col,
      });
    }

    return doc;
  }

 function parseColumn(rawCol, rawVal) {
  let val, reference, excluded = false;

  const parts = rawCol.split(/[:>]/);
  const col = parts[0];

  if(parts.length === 1) {
    val = rawVal;
  } else if(parts.length === 2) {
    const type = parts[1];
    switch(type) {
      case 'date': val = new Date(rawVal); break;
      case 'timestamp': val = parseTimestamp(rawVal); break;
      case 'int': val = int(rawVal); break;
      case 'bool': val = parseBool(rawVal); break;
      case 'string': val = rawVal; break;
      case 'float': val = Number.parseFloat(rawVal); break;
      case 'excluded': val = rawVal; excluded = true; break;
      default: {
        if(isReference(type)) {
          val = rawVal;
          reference = type;
        } else {
          throw new Error(`Unrecognised column type: ${type} for ${rawCol}`);
        }
      }
    }
   } else {
    throw new Error(`Wrong number of parts in column definition: ${rawCol} (should be 1, 2 or 4, but found ${parts.length}).`);
   }
   return { col:col, val:val, reference:reference, excluded:excluded };
  }

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

	function removeExcludedField(exclusion) {
	  delete exclusion.doc[exclusion.propertyName];
	}

	/** @return JSON string with circular references ignored */
	function toSafeJson(o, depth, seen) {
	  if(!depth) depth = 0;
	  if(!seen) seen = [];

	  const TAB = '  ';
	  let i = depth, indent = '';
	  while(--i >= 0) indent += TAB;

	  switch(typeof o) {
	    case 'boolean':
	    case 'number':
	      return o;
	    case 'string':
	      return `"${o}"`;
	    case 'object':
	      if(Array.isArray(o)) {
	        return `${indent}[\n` +
	            o.map(el => toSafeJson(el, depth + 1)) +
	            `\n${indent}]`;
	      } else if(o instanceof Date) {
	        return `"${o.toJSON()}"`;
	      }
	      return '{' +
	          Object.keys(o)
	              .map(k => {
	                const v = o[k];
	                if(seen.includes(v)) return;
	                return `\n${TAB}${indent}"${k}": ` +
	                    toSafeJson(v, depth+1, seen.concat(o));
	              })
	              .filter(el => el) +
	          '\n' + indent + '}';
	    default: throw new Error(`Unknown type/val: ${typeof o}/${o}`);
	  }
	}

const fetch = {
  /*
  Fetches all of the documents associated with the "contactIds" and confirms they exist.
  */

  contactList: async (db, ids) => {
  	info("downloading doc(s)");
    const contactDocs = await db.allDocs({
      keys: ids,
      include_docs: true,
    });

    const missingContactErrors = contactDocs.rows.filter(row => !row.doc).map(row => `Contact with id '${row.key}' could not be found.`);
    if (missingContactErrors.length > 0) {
      throw Error(missingContactErrors);
    }

    return contactDocs.rows.reduce((agg, curr) => Object.assign(agg, { [curr.doc._id]: curr.doc }), {});
  },

   userNamesList: async (db, ids) => {
    const contactDocs = await db.allDocs({
      keys: ids,
      include_docs: true,
    });

    const missingContactErrors = contactDocs.rows.filter(row => !row.doc).map(row => `User with username '${row.key}' could not be found.`);
    if (missingContactErrors.length > 0) {
      throw Error(missingContactErrors);
    }

    return contactDocs.rows.reduce((agg, curr) => Object.assign(agg, { [curr.doc._id]: curr.doc }), {});
  }
 }

const downloadDocs = async (csv, ids, db, args) => {
	const contactDocs = await fetch.contactList(db, ids);
	return processContacts('contact', csv, ids, contactDocs, args);
}

  // Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });
  var colNames = (args.columns || args.column || '')
    .split(',')
    .filter(id => id);


  return {
    colNames,
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
    force: !!args.force,
  };
};
