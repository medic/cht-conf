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
  return args.updateOfflineDocs
    || environment.force
    || overwriteAllFiles
    || !fs.exists(jsonDocPath(args.docDirectoryPath, doc._id));
};

const saveJsonDoc = (doc, args) => {
  return fs.write(jsonDocPath(args.docDirectoryPath, doc._id), safeStringify(doc) + '\n');
};

const writeDocs = (docs, args) => {
  let overwriteAllFiles = false;
  
  return Promise.all(Object.values(docs).map(doc => {
    const overwriteFile = overwriteFileCheck(doc, args, overwriteAllFiles);

    if (!overwriteFile) {
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
  }));
};

const execute = () => {
  const args = parseExtraArgs(environment.pathToProject, environment.extraArgs);
  const db = pouch();
  const docDirectoryPath = args.docDirectoryPath;
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
    .then(() => writeDocs(model.docs, args));
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

function columnsAreValid(csvColumns, toIncludeColumns) {
  const splitCsvColumns = csvColumns.map(column => column && column.split(':')[0]);
  return toIncludeColumns.every(column => splitCsvColumns.includes(column));    
}
const parseColName = colName => colName.split(':')[0];
const getColNamesToInclude = (csvColNames, targetColNames) => {
  const filteredCsvColNames = csvColNames.filter(colName => colName !== DOCUMENT_ID);
  if (!targetColNames.length) {
    warn(' No columns specified, the script will add all the columns in the CSV!');
    return filteredCsvColNames;
  }
  
  if (!columnsAreValid(filteredCsvColNames, targetColNames)) {
    throw Error('The column name(s) specified do not exist.');
  }

  return filteredCsvColNames.filter(column => targetColNames.includes(parseColName(column)));
};

const getCsvColNameIndex = csvColNames => colName => csvColNames.indexOf(colName);
const mapColNamesToCsvIndex = (csvColNames, toIncludeColumns) => toIncludeColumns.map(getCsvColNameIndex(csvColNames));


const getDocIdForCsvRow = (docType, uuidIndex) => row => {
  const documentId = row[uuidIndex];
  const idPrefix =  docType === 'contact' ? '' : 'org.couchdb.user:';
  return `${idPrefix}${documentId}`;
};

const getCsvRowFilterFn = (uuidIndex, toIncludeIndex) => {
  if (toIncludeIndex.length > 0) {
    return row => toIncludeIndex.map(index => row[index]);
  }

  return row => {
    const updatedRow = [...row];
    updatedRow.splice(uuidIndex, 1);
    return updatedRow;
  };
};

const isColNameProtected = col => EDIT_RESERVED_COL_NAMES.includes(col.split('.')[0]);
const processCsvColumn = (doc, row) => (colName, index) => {
  const { col, val, excluded } = toDocs.parseColumn(colName, row[index]);
    
  if (isColNameProtected(col)) {
    throw new Error(`Cannot set property defined by column '${col}' - this property name is protected.`);
  }

  toDocs.setCol(doc, col, val);
  if (excluded) { 
    model.exclusions.push({
      doc,
      propertyName: col,
    });
  }
};
const processCsvRow = colNames => ([doc, row]) => colNames.forEach(processCsvColumn(doc, row));

const getColIndexesToInclude = (colNames, cols, toIncludeColumns) => {
  if(colNames.length) {
    return mapColNamesToCsvIndex(cols, toIncludeColumns);
  } 
  return [];
};

const processDocs = (docType, csv, documentDocs, args) => {
  const { rows, cols } = fs.readCsv(csv);
  const uuidIndex = cols.indexOf(DOCUMENT_ID);
  const colNamesToInclude = getColNamesToInclude(cols, args.colNames);
  const colIndexesToInclude = getColIndexesToInclude(args.colNames, cols, colNamesToInclude);
  const getFilteredCsvRow = getCsvRowFilterFn(uuidIndex, colIndexesToInclude);

  const rowDocs = rows
    .map(getDocIdForCsvRow(docType, uuidIndex))
    .map(id => documentDocs[id]);

  rows
    .map(getFilteredCsvRow)
    .map((row, index) => [rowDocs[index], row])
    .map(processCsvRow(colNamesToInclude));
  return rowDocs;
};

const processDocuments =  async (docType, csv, ids, db, args) => {
  const documentDocs = await fetchDocumentList(db, ids, args);
  return processDocs(docType, csv, documentDocs, args);
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
    updateOfflineDocs: args.updateOfflineDocs,
  };
};

module.exports = {
  requiresInstance: true,
  execute
};
