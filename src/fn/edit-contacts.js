const minimist = require('minimist');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const path = require('path');
const { warn, info } = require('../lib/log');
const pouch = require('../lib/db');
const toDocs = require('./csv-to-docs');
const EDIT_RESERVED_COL_NAMES = [ 'parent', '_id', 'name', 'reported_date' ];

const execute = () => {
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
  const csvFiles = args.csvFiles;

  return csvFiles.map(fileName => `${csvDir}/${fileName}`)
  .filter(name => name.endsWith('.csv'))
  .reduce((promiseChain, csv) =>
    promiseChain
    .then(() => {
      info('Processing CSV file:', csv, '…');

      const nameParts = fs.path.basename(csv).split('.');
      const prefix = nameParts[0];
      switch(prefix) {
        case 'contact':  return processContacts(csv, getIDs(csv, prefix), db, args);
        case 'users': return processUsers(csv, getIDs(csv, prefix), db, args);
        default: throw new Error(`Unrecognised CSV type ${prefix} for file ${csv}`);
      }
    })
    .then(docs => addToModel(csv, docs)),
    Promise.resolve())

  .then(() => model.exclusions.forEach(toDocs.removeExcludedField))
  .then(() => Promise.all(Object.values(model.docs).map(saveJsonDoc)));
};

const model = {
  csvFiles: {},
  docs: {},
  exclusions: []
};

const addToModel = (csvFile, docs) => {
  csvFile = csvFile.match(/^(?:.*[\/\\])?csv[\/\\](.*)\.csv$/)[1]; // eslint-disable-line no-useless-escape
  model.csvFiles[csvFile] = docs;
  docs.forEach(doc => {
    model.docs[doc._id] = doc;
  });
};

function getIDs(csv, docType) {
  const { rows, cols } = fs.readCsv(csv);
  const index = cols.indexOf('documentID');
  if (index === -1){
   throw Error('missing "documentID" column.');
  }

  const idPrefix =  docType === 'contact' ? '' : 'org.couchdb.user:';
  return rows.map((item) => idPrefix + item[index]);
}

function processDocs(docType, csv, contactDocs, args) {
  const { rows, cols } = fs.readCsv(csv);
  const uuidIndex = cols.indexOf('documentID');
  let inputColumns = args.colNames;
  let toIncludeIndex = [];
  if (!inputColumns.length) {
    warn(' No columns specified, the script will add all the columns in the CSV!');
    inputColumns = cols;

  } else {
    if (!columnsAreValid(cols,inputColumns)) {
      throw Error('The column name(s) specified do not exist.');
    }

    inputColumns = cols.filter(e => inputColumns.includes(e.split(':')[0]));
    toIncludeIndex = inputColumns.map(column => cols.indexOf(column));

    if (toIncludeIndex.includes('documentID')) {
      toIncludeIndex.splice(inputColumns.indexOf('documentID'),1);
    }
  }

  if (inputColumns.includes('documentID')) {
    inputColumns.splice(inputColumns.indexOf('documentID'),1);
  }
  return rows
  .map(r => processCsv(docType, inputColumns, r, uuidIndex, toIncludeIndex, contactDocs));
}

function columnsAreValid(csvColumns, inputColumns) {
  const splitCsvColumns = csvColumns.map(column => column && column.split(':')[0]);
  return inputColumns.every(column => splitCsvColumns.includes(column));    
}

function processCsv(docType, cols, row, uuidIndex, toIncludeIndex, contactDocs) {
  const contactId = row[uuidIndex];
  const idPrefix =  docType === 'contact' ? '' : 'org.couchdb.user:';
  const doc = contactDocs[idPrefix + contactId];

  if(toIncludeIndex.length > 0){
    row = toIncludeIndex.map(uuidIndex => row[uuidIndex]);
  } else {
    row.splice(uuidIndex,1);
  }

  for(let i=0; i<cols.length; ++i) {
    const { col, val, excluded } = toDocs.parseColumn(cols[i], row[i]);
    const colParts = col.split('.');
    
    if(EDIT_RESERVED_COL_NAMES.includes(colParts[0]))
      throw new Error(`Cannot set property defined by column '${col}' - this property name is protected.`);

    toDocs.setCol(doc, col, val);
    if(excluded) model.exclusions.push({
      doc: doc,
      propertyName: col,
    });
  }
  return doc;
}

const processUsers =  async (csv, ids, db, args) => {
  const contactDocs = await fetchContactList(db, ids);
  return  processDocs('user', csv, contactDocs, args);
};

const processContacts =  async (csv, ids, db, args) => {
  const contactDocs = await fetchContactList(db, ids);
  return  processDocs('contact', csv, contactDocs, args);
};

const fetchContactList = async (db, ids) => {
  info('Downloading doc(s)...');
  const contactDocs = await db.allDocs({
    keys: ids,
    include_docs: true,
  });

  const missingContactErrors = contactDocs.rows.filter(row => !row.doc).map(row => `Contact with id '${row.key}' could not be found.`);
  if (missingContactErrors.length > 0) {
    throw Error(missingContactErrors);
  }

  return contactDocs.rows.reduce((agg, curr) => Object.assign(agg, { [curr.doc._id]: curr.doc }), {});
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });
  const colNames = (args.columns || args.column || '')
  .split(',')
  .filter(id => id);

  const csvFiles = (args.files || args.file || 'contact.csv')
  .split(',')
  .filter(id => id);

  return {
    colNames,
    csvFiles,
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
    force: !!args.force,
  };
};

module.exports = {
  requiresInstance: true,
  execute
};
