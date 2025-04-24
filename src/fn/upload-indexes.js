const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const log = require('../lib/log');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');
const insertOrReplace = require('../lib/insert-or-replace');
const jsonDiff = require('json-diff');

// https://pouchdb.com/api.html#list_indexes
// > Also tells you about the special _all_docs index, i.e. the default index on the _id field.
const BUILT_IN_INDEX_TYPE = 'special';

const hasDefinitionDiff = (dbIndex, configDefinition) => {
  // The db item's fields have an order accompanying the field
  const dbItemDefinition = {...dbIndex.def, fields: (dbIndex.def.fields || []).map(e => Object.keys(e)[0])};
  // We observed that our unit tests returned no '$and' grouping for the partial filter.
  // In contrast, testing against a real instance returned a grouping.
  // To reliably determine definition diff, we ignore the db filter fields root '$and'.
  // https://docs.couchdb.org/en/stable/api/database/find.html#explicit-operators

  const isRootAndOnly = (
    Object.keys(dbItemDefinition.partial_filter_selector).length === 1 &&
    Object.hasOwn(dbItemDefinition.partial_filter_selector, '$and') &&
    Array.isArray(dbItemDefinition.partial_filter_selector['$and'])
  );

  dbItemDefinition.partial_filter_selector = isRootAndOnly
    ? Object.assign({}, ...dbItemDefinition.partial_filter_selector['$and'])
    : dbItemDefinition.partial_filter_selector;
  
  return !!jsonDiff.diff(configDefinition, dbItemDefinition);
};

const cleanUpIndexes = async (db, storedIndexes, indexConfig) => {
  for(const [key, value] of Object.entries(storedIndexes)){
    // Delete the index if it is no longer in the config
    if(!(key in indexConfig)) {
      await db.deleteIndex(value);
    }
    // We probably don't want to unnecessarily delete/recreate indexes
    else if (key in indexConfig && hasDefinitionDiff(value, indexConfig[key])){
      await db.deleteIndex(value);
      log.warn(`The "${value.name}" index config differs from what is saved and has been deleted for recreation.`);
    }
  }
};

const createIndexes = async (db, indexConfig) => {
  for(const [key, value] of Object.entries(indexConfig)){
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
    .map(doc => [doc.name, doc])
  );

  await cleanUpIndexes(db, indexes, indexMapping);
  await createIndexes(db, indexMapping);
};

module.exports = {
  requiresInstance: true,
  execute: async () => {
    const key = 'indexes';
    const path = `${environment.pathToProject}/${key}.json`;
    const indexPath = fs.path.resolve(path);

    if(!fs.exists(indexPath)) {
      log.warn(`No ${key} mapping file found at path: ${indexPath}`);
      return Promise.resolve();
    }

    const indexMapping = fs.readJson(indexPath);

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

    return Promise.resolve();
  }
};
