const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const log = require('../lib/log');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');
const insertOrReplace = require('../lib/insert-or-replace');
const jsonDiff = require('json-diff');
const { info } = require('../lib/log');

// https://pouchdb.com/api.html#list_indexes
// > Also tells you about the special _all_docs index, i.e. the default index on the _id field.
const BUILT_IN_INDEX_TYPE = 'special';

const standardizePartialFilterContent = (partialFilter) => {
  if (!partialFilter) {
    return;
  }

  const isRootAndOnly = (
    Object.keys(partialFilter).length === 1 &&
    Object.hasOwn(partialFilter, '$and') &&
    Array.isArray(partialFilter.$and)
  );

  return isRootAndOnly ? Object.assign({}, ...partialFilter.$and) : partialFilter;
};

const hasDefinitionDiff = (dbIndex, configDefinition) => {
  // The db item's fields have an order accompanying the field
  const dbItemDefinition = { ...dbIndex.def, fields: (dbIndex.def.fields || []).map(e => Object.keys(e)[0]) };

  // We observed that our unit tests returned no '$and' grouping for the partial filter.
  // In contrast, testing against a real instance returned a grouping.
  // To reliably determine definition diff, we ignore the db filter fields root '$and'.
  // https://docs.couchdb.org/en/stable/api/database/find.html#explicit-operators
  dbItemDefinition.partial_filter_selector = standardizePartialFilterContent(dbItemDefinition.partial_filter_selector);

  return !!jsonDiff.diff(configDefinition, dbItemDefinition);
};

const cleanUpIndexes = async (db, storedIndexes, indexConfig) => {
  for (const [key, value] of Object.entries(storedIndexes)) {
    // Delete the index if it is no longer in the config
    if (!(key in indexConfig)) {
      await db.deleteIndex(value);
    } else if (key in indexConfig && hasDefinitionDiff(value, indexConfig[key])) {
      // We probably don't want to unnecessarily delete/recreate indexes
      await db.deleteIndex(value);
      log.warn(`The "${value.name}" index config differs from what is saved and has been deleted for recreation.`);
    }
  }
};

const createIndexes = async (db, indexConfig) => {
  for (const [key, value] of Object.entries(indexConfig)) {
    const props = {
      'index': value,
      'ddoc': key,
      'name': key,
      'type': 'json'
    };

    await db.createIndex(props);
  }
};

const manageIndexes = async (db, indexMapping = {}) => {
  const result = await db.getIndexes();
  const indexes = Object.fromEntries((result.indexes || [])
    .filter(obj => obj.type !== BUILT_IN_INDEX_TYPE)
    // We're using the "name" here as the "ddoc" loaded from db will have a "_design/" prefix
    .map(doc => [doc.name, doc]));

  await cleanUpIndexes(db, indexes, indexMapping);
  await createIndexes(db, indexMapping);
};

const bold = text => `\x1b[1m${text}\x1b[0m`;
const usage = () => {
  /* eslint-disable max-len */
  info(`
    ${bold('cht-conf\'s upload-database-indexes action')}
    Define indexes for the "medic" database to enhance query performance. To index only a subset of documents, use "partial_filter_selector".

    ${bold('Structure:')}
    | ${bold('Prop')}                                 | ${bold('Description')}                                                                    |
    | ${bold('[key]')}                                | The object key will be used for both the "name" and "ddoc" values of the index |
    | ${bold('"fields"')}                             | A list of fields to index                                                      |
    | ${bold('"partial_filter_selector"')} (optional) | A selector used to filter the set of documents included in the index           |

    ${bold('Example:')}
    {
      "testing_by_id_and_type": {
        "fields": ["_id", "type"],
        "partial_filter_selector": {
          "type": { "$nin": ["form", "translations", "meta"] },
          "_id": { "$nin": ["branding", "extension-libs", "resources"] }
        }
    }

    ${bold('Rational:')}
    - The index is created on the "_id" and "type" fields. 
      According to the ESR (Equality, Sort, Range) rule, fields used in equality matches should come first, followed by sort fields, and then range fields. 
      This ordering optimizes query performance.
    - The "partial_filter_selector" limits the index to documents where "type" and "_id" do not match the specified values, reducing index size and improving efficiency.

    The filename 'database-indexes.json' should be used to contain the above configuration.

    ${bold('More info:')}
    https://pouchdb.com/api.html#create_index
    https://pouchdb.com/api.html#query_index
    https://docs.couchdb.org/en/stable/api/database/find.html#db-find
    https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
  `);
};

const throwIfNotObject = (value, key = null) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    const message = key
      ? `Entry "${key}" is not a valid JSON object (map).`
      : 'The top-level structure must be a JSON object (map).';
    usage();
    throw new Error(message);
  }
};

const parseAndCheckFile = (indexPath) => {
  const map = fs.readJson(indexPath);

  throwIfNotObject(map);

  for (const [key, entry] of Object.entries(map)) {
    throwIfNotObject(entry, key);

    if (!Object.hasOwn(entry, 'fields')) {
      throw new Error(`Missing "fields" property in entry "${key}".`);
    }
  }

  return map;
};

module.exports = {
  requiresInstance: true,
  execute: async () => {
    const key = 'database-indexes';
    const path = `${environment.pathToProject}/${key}.json`;
    const indexPath = fs.path.resolve(path);

    if (!fs.exists(indexPath)) {
      log.warn(`No ${key} mapping file found at path: ${indexPath}`);
      return;
    }

    const indexMapping = parseAndCheckFile(indexPath);

    const doc = {
      _id: key,
      [key]: indexMapping
    };

    const db = pouch();

    const changes = await warnUploadOverwrite.preUploadDoc(db, doc);
    if (changes) {
      await manageIndexes(db, indexMapping);
      await insertOrReplace(db, doc);

      log.info(`${key} file uploaded`);
    } else {
      log.info(`${key} file not uploaded as no changes found`);
    }

    await warnUploadOverwrite.postUploadDoc(db, doc);
  }
};
