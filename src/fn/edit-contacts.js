const minimist = require('minimist');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const path = require('path');
const { warn, info } = require('../lib/log');
const pouch = require('../lib/db');
const safeStringify = require('../lib/safe-stringify');
const toDocs = require('./csv-to-docs');
const EDIT_RESERVED_COL_NAMES = [ 'parent', '_id', 'name', 'reported_date' ];
const DOCUMENT_ID =  'documentID';
const userPrompt = require('../lib/user-prompt');
const fetchDocumentList = require('../lib/fetch-document-list');
const OVERWRITE_ALL_FILES_OPTION = 1;
const CANCEL_OVERWRITE_OPTION = 2;

const jsonDocPath = (directoryPath, docID) => `${directoryPath}/${docID}.doc.json`;

// check to see if we should write/overwrite the file
const overwriteFileCheck = (doc, args, overwriteAllFiles) => {
  return args.updateOfflineDocs || args.force || overwriteAllFiles || !fs.exists(jsonDocPath(args.docDirectoryPath, doc._id));
};

const saveJsonDoc = (doc, args) => {
  const writeFile = (writeDoc) => fs.write(jsonDocPath(args.docDirectoryPath, writeDoc._id), safeStringify(writeDoc) + '\n');
  
  return writeFile(doc);
};

const execute = () => {
  const args = parseExtraArgs(environment.pathToProject, environment.extraArgs, environment.force);
  const db = pouch();
  const docDirectoryPath = args.docDirectoryPath;
  let overwriteAllFiles = false;
  fs.mkdir(docDirectoryPath);

  const csvDir = `${environment.pathToProject}/csv`;
  if (!fs.exists(csvDir)) {
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
          case 'contact':  return processDocuments('contact', csv, getIDs(csv, prefix), db, args);
          case 'users': return processDocuments('user', csv, getIDs(csv, prefix), db, args);
          default: throw new Error(`Unrecognised CSV type ${prefix} for file ${csv}`);
        }
      })
      .then(docs => addToModel(csv, docs)),
      Promise.resolve())

    .then(() => model.exclusions.forEach(toDocs.removeExcludedField))
    .then(() => Promise.all(Object.values(model.docs).map(doc => {
      const overwriteFile = overwriteFileCheck(doc, args, overwriteAllFiles);

      if(!overwriteFile) {
        const userSelection = userPrompt.keyInSelect(
          ['overwrite this file', 'overwrite this file and all subsequent files'],
          `${doc._id}.doc.json already exists in the chosen directory. What do you want to do?`
        );

        if (userSelection === undefined || userSelection === CANCEL_OVERWRITE_OPTION) {
          throw new Error('User canceled the action.');
        }
        overwriteAllFiles = (userSelection === OVERWRITE_ALL_FILES_OPTION);
      }
      return saveJsonDoc(doc, args);
    })));
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
  const index = cols.indexOf(DOCUMENT_ID);
  if (index === -1){
   throw Error('missing "documentID" column.');
  }

  const idPrefix =  docType === 'contact' ? '' : 'org.couchdb.user:';
  return rows.map((item) => idPrefix + item[index]);
}

function processDocs(docType, csv, documentDocs, args) {
  const { rows, cols } = fs.readCsv(csv);
  const uuidIndex = cols.indexOf(DOCUMENT_ID);
  const colNames = args.colNames;
  let toIncludeColumns, toIncludeIndex;
  if (!colNames.length) {
    warn(' No columns specified, the script will add all the columns in the CSV!');
    toIncludeColumns = cols;
    toIncludeIndex = [];

  } else {
    if (!columnsAreValid(cols,colNames)) {
      throw Error('The column name(s) specified do not exist.');
    }

    toIncludeColumns = cols.filter(column => colNames.includes(column.split(':')[0]));
    toIncludeIndex = toIncludeColumns.map(column => cols.indexOf(column));

    if (toIncludeColumns.includes(DOCUMENT_ID)) {
      toIncludeIndex.splice(toIncludeColumns.indexOf(DOCUMENT_ID),1);
    }
  }

  if (toIncludeColumns.includes(DOCUMENT_ID)) {
    toIncludeColumns.splice(toIncludeColumns.indexOf(DOCUMENT_ID),1);
  }
  return rows
    .map(r => processCsv(docType, toIncludeColumns, r, uuidIndex, toIncludeIndex, documentDocs));
}

function columnsAreValid(csvColumns, toIncludeColumns) {
  const splitCsvColumns = csvColumns.map(column => column && column.split(':')[0]);
  return toIncludeColumns.every(column => splitCsvColumns.includes(column));    
}

function processCsv(docType, cols, row, uuidIndex, toIncludeIndex, documentDocs) {
  const documentId = row[uuidIndex];
  const idPrefix =  docType === 'contact' ? '' : 'org.couchdb.user:';
  const doc = documentDocs[idPrefix + documentId];

  if (toIncludeIndex.length > 0) {
    row = toIncludeIndex.map(index => row[index]);
  } else {
    row.splice(uuidIndex,1);
  }

  for(let i=0; i<cols.length; ++i) {
    const { col, val, excluded } = toDocs.parseColumn(cols[i], row[i]);
    
    if (EDIT_RESERVED_COL_NAMES.includes(col.split('.')[0])) {
      throw new Error(`Cannot set property defined by column '${col}' - this property name is protected.`);
    }

    toDocs.setCol(doc, col, val);
    if (excluded) { 
      model.exclusions.push({
        doc: doc,
        propertyName: col,
      });
    }
  }
  return doc;
}

const processDocuments =  async (docType, csv, ids, db, args) => {
  const documentDocs = await fetchDocumentList(db, ids, args);
  return processDocs(docType, csv, documentDocs, args);
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = [], force) => {
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
    updateOfflineDocs: args.updateOfflineDocs,
    force: !!force,
  };
};

module.exports = {
  requiresInstance: true,
  execute
};