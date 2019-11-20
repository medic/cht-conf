const minimist = require('minimist');
const stringify = require('canonical-json/index2');
const uuid5 = require('uuid/v5');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const path = require('path');
const { warn, trace, info, error } = require('../lib/log');
const generateCsv = require('../lib/generate-users-csv');
const pouch = require('../lib/db');
const toDocs = require('./csv-to-docs');

const pretty = o => JSON.stringify(o, null, 2);

const RESERVED_COL_NAMES = [ 'type', 'form', '_id' ];


module.exports = ()=> {
  const args = parseExtraArgs(environment.pathToProject, environment.extraArgs);
  const db = pouch();
  const docDirectoryPath = args.docDirectoryPath;
  fs.mkdir(docDirectoryPath);
  const saveJsonDoc = doc => fs.write(`${docDirectoryPath}/${doc._id}.doc.json`, toDocs.toSafeJson(doc) + '\n');

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

  .then(() => model.exclusions.forEach(toDocs.removeExcludedField))
  .then(() => {
    if(model.users.length) {
      generateCsv(model.users, environment.pathToProject + '/users.csv');
    }
  })
  .then(() => Promise.all(Object.values(model.docs).map(saveJsonDoc)));
};

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
 }

 function processContacts(contactType, csv, ids, contactDocs, args){
  const { rows, cols } = fs.readCsv(csv);
  var colNames = args.colNames;
  if (colNames.length === 0) {
    warn(' No columns specified, the script will add all the columns in the CSV!');
    colNames = cols;
  }  
  else {
    var splitFileColumns = [];

    for(fileColumn of cols) {
      if (fileColumn !== null) {
        splitFileColumns.push(fileColumn.split(':')[0]);
      }      
    }
    columnsValid = colNames.every(function(column) { return splitFileColumns.includes(column);});
    if (!columnsValid){
      throw Error('The column name(s) specified do not exist.');
    }
  }
  var index = cols.indexOf('uuid');
  return rows
  .map(r => processCsv(contactType, cols, r, ids, index, contactDocs));

}

function processCsv(docType, cols, row, ids, index, contactDocs) {
 const contactId = row[index];
 const doc = contactDocs[contactId];
 row.splice(index,1);
 if (cols.includes('uuid')) {
  cols.splice(cols.indexOf('uuid'),1);
 }
 for(let i=0; i<cols.length; ++i) {
  const { col, val, reference, excluded } = toDocs.parseColumn(cols[i], row[i]);
  toDocs.setCol(doc, col, val);
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

const fetch = {
  /*
  Fetches all of the documents associated with the "contactIds" and confirms they exist.
  */

  contactList: async (db, ids) => {
  	info("Downloading doc(s)...");
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
