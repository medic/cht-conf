const minimist = require('minimist');
const stringify = require('canonical-json/index2');
const uuid5 = require('uuid/v5');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { info, warn } = require('../lib/log');
const generateCsv = require('../lib/generate-users-csv');
const pouch = require('../lib/db');


const pretty = o => JSON.stringify(o, null, 2);

const RESERVED_COL_NAMES = [ 'type', 'form' ];
const REF_MATCHER = /^(?:GET )?((\w+) OF )?(\w+) WHERE (.*)$/i;
const PLACE_TYPES = [ 'clinic', 'district_hospital', 'health_center' ];



module.exports = ()=> {
  // const args = parseExtraArgs(environment.pathToProject, environment.extraArgs);
   const db = pouch();
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
            info('Processing CSV file:', prefix, '…');

            switch(prefix) {
              case 'contact': 
              // info(processContacts('contact', csv));
              return processContacts('contact', csv);
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




  // Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });

  const contactIds = (args.contacts || args.contact || '')
    .split(',')
    .filter(id => id);

  if (contactIds.length === 0) {
    // usage();
    throw Error('Action "move-contacts" is missing required list of contact_id to be moved');
  }

  if (!args.parent) {
    // usage();
    throw Error('Action "move-contacts" is missing required parameter parent');
  }

  return {
    parentId: args.parent,
    contactIds,
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
    force: !!args.force,
  };
};
