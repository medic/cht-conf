const stringify = require('canonical-json/index2');
const uuid5 = require('uuid/v5');

const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { info, warn } = require('../lib/log');



module.exports = ()=> {
  const couchUrlUuid = uuid5('http://medicmobile.org/configurer/csv-to-docs/permanent-hash', uuid5.URL);

  const csvDir = `${environment.pathToProject}/csv`;
  if(!fs.exists(csvDir)) {
    warn(`No csv directory found at ${csvDir}.`);
    return Promise.resolve();
  }

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

  return fs.recurseFiles(csvDir)
    .filter(name => name.endsWith('.csv'))
    .reduce((promiseChain, csv) =>
        promiseChain
          .then(() => {
            info('Processing CSV file:', csv, '…');

            const nameParts = fs.path.basename(csv).split('.');
            const prefix = nameParts[0];
            switch(prefix) {
              case 'supervisor': return processContacts('contact', csv);
              case 'workflow':  return processWorkflow(nameParts[1], csv);
              default: throw new Error(`Unrecognised CSV type ${prefix} for file ${csv}`);
            }
          })
          .then(docs => addToModel(csv, docs)),
      Promise.resolve())

    .then(() => model.references.forEach(updateRef))
    .then(() => model.exclusions.forEach(removeExcludedField))
    .then(() => {
      if(model.users.length) {
        generateCsv(model.users, environment.pathToProject + '/users.csv');
      }
    })
    .then(() => Promise.all(Object.values(model.docs).map(saveJsonDoc)));


  function updateRef(ref) {
    const match = ref.matcher.match(REF_MATCHER);
    const [, , propertyName, type, where] = match;

    const referencedDoc = Object.values(model.docs)
      .find(doc => (doc.type === type ||
              (type === 'place' && PLACE_TYPES.includes(doc.type))) &&
          matchesWhereClause(where, doc, ref.colVal));

    if(!referencedDoc) {
      throw new Error(`Failed to match reference ${pretty(ref)}`);
    }

    ref.doc[ref.targetProperty] = propertyName ? referencedDoc[propertyName] : referencedDoc;
  }

  function processPersons(csv) {
    return processContacts('person', csv);
  }

  function processPlaces(csv) {
    const placeType = fs.path.basename(csv).split('.')[1];
    return processContacts(placeType, csv);
  }

  function processReports(report_type, csv) {
    const { rows, cols } = fs.readCsv(csv);
    return rows
      .map(r => processCsv('data_record', cols, r, { form:report_type }));
  }

  function processContacts(contactType, csv) {
    const { rows, cols } = fs.readCsv(csv);
    return rows
      .map(r => processCsv(contactType, cols, r));
  }

  function processUsers(csv){
    const { rows, cols } = fs.readCsv(csv);
    return rows
      .map(r => processCsv('user', cols, r));
  }

  function processCsv(docType, cols, row, baseDoc) {
    const doc = baseDoc || {};
    doc.type = docType;

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

    return withId(doc);
  }

  function withId(json) {
    const id = uuid5(stringify(json), couchUrlUuid);
    json._id = id;
    return json;
  }
};

const writeDocumentToDisk = ({ docDirectoryPath }, doc) => {
  const destinationPath = path.join(docDirectoryPath, `${doc._id}.doc.json`);
  if (fs.exists(destinationPath)) {
    warn(`File at ${destinationPath} already exists and is being overwritten.`);
  }

  trace(`Writing updated document to ${destinationPath}`);
  fs.writeJson(destinationPath, doc);
};

const fetch = {
  /*
  Fetches all of the documents associated with the "contactIds" and confirms they exist.
  */
  contactList: async (db, ids) => {
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



 const updateDocs = async (options, db) => {
  trace(`Fetching contact details for parent: ${options.parentId}`);

  const contactDocs = await fetch.contactList(db, options.contactIds);
  const usersDocs = await fetch.contactList(db, options.usernameIds);

  let affectedContactCount = 1, affectedUserNamesCount = 0;

  const replacementLineage = lineageManipulation.createLineageFromDoc(parentDoc);


const finalList = [...contactDocs, ...usersDocs]
for (let contactId of finalList) {

}


  for (let contactId of options.contactIds) {
    const contactDoc = contactDocs[contactId];
    const descendantsAndSelf = await fetch.descendantsOf(db, contactId);

    // Check that primary contact is not removed from areas where they are required
    const invalidPrimaryContactDoc = await constraints.getPrimaryContactViolations(contactDoc, descendantsAndSelf);
    if (invalidPrimaryContactDoc) {
      throw Error(`Cannot remove contact ${prettyPrintDocument(invalidPrimaryContactDoc)} from the hierarchy for which they are a primary contact.`);
    }

    trace(`Considering lineage updates to ${descendantsAndSelf.length} descendant(s) of contact ${prettyPrintDocument(contactDoc)}.`);
    const updatedDescendants = replaceLineageInContacts(descendantsAndSelf, replacementLineage, contactId);

    const ancestors = await fetch.ancestorsOf(db, contactDoc);
    trace(`Considering primary contact updates to ${ancestors.length} ancestor(s) of contact ${prettyPrintDocument(contactDoc)}.`);
    const updatedAncestors = replaceLineageInAncestors(descendantsAndSelf, ancestors);

    const reportsCreatedByDescendants = await fetch.reportsCreatedBy(db, descendantsAndSelf.map(descendant => descendant._id));
    trace(`${reportsCreatedByDescendants.length} report(s) created by these affected contact(s) will update`);
    const updatedReports = replaceLineageInReports(reportsCreatedByDescendants, replacementLineage, contactId);

    [...updatedDescendants, ...updatedReports, ...updatedAncestors].forEach(updatedDoc => {
      lineageManipulation.minifyLineagesInDoc(updatedDoc);
      writeDocumentToDisk(options, updatedDoc);
    });

    affectedContactCount += updatedDescendants.length + updatedAncestors.length;
    affectedReportCount += updatedReports.length;

    info(`Staged updates to ${prettyPrintDocument(contactDoc)}. ${updatedDescendants.length} contact(s) and ${updatedReports.length} report(s).`);
  }

  info(`Staged changes to lineage information for ${affectedContactCount} contact(s) and ${affectedReportCount} report(s).`);
};
