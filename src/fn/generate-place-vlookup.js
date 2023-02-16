const csvParse = require('csv-parse/lib/sync');
const Json2csvParser = require('json2csv').Parser;
const API = require('../lib/api');
const DB = require('../lib/db');
const fs = require('../lib/sync-fs');
const environment = require('../lib/environment');
const { info } = require('../lib/log');

const BATCH_SIZE = 1000;
const PLACE_NAME = 'Place Name';
const PLACE_UUID = 'Place UUID';
const DEFAULT_PLACE_TYPES = ['district_hospital', 'health_center', 'clinic'];
const MAX_LINEAGE_DEPTH = 3;

const getPlaceTypes = async (db) => {
  const { settings: { contact_types } } = await db.get('settings');
  if (Array.isArray(contact_types) && contact_types.length) {
    return contact_types
      .filter(({ person }) => !person)
      .map(({ id }) => id);
  }
  return DEFAULT_PLACE_TYPES;
};

const getIdentDataForPlaces = async (db, api, placeType) => {
  const contactsCsv = await api.getExport('contacts', { filters: { types: { selected: [placeType] } } });
  return csvParse(contactsCsv, { columns: true })
    .map(({ id, rev }) => ({ id, rev }));
};

const getBatches = (data) => Array.from(
  new Array(Math.ceil(data.length / BATCH_SIZE)),
  (_, i) => data.slice(i * BATCH_SIZE, i * BATCH_SIZE + BATCH_SIZE)
);

const getDocs = async (db, docs) => {
  const { results } = await db.bulkGet({ docs });
  return results
    .filter(({ docs }) => docs.length)
    .map(({ docs }) => docs[0])
    .filter(({ ok }) => ok)
    .map(({ ok }) => ok);
};

const getContactDictionary = async (db, contactsData) => {
  const contactBatches = getBatches(contactsData);
  const contactDict = {};
  for (const batch of contactBatches) {
    (await getDocs(db, batch))
      .filter(({ _id, name }) => _id && name)
      .forEach(({ _id, name, parent }) => contactDict[_id] = { _id, name, parent });
  }
  return contactDict;
};

const getContactName = (contactDict, _id) => {
  const contact = contactDict[_id];
  if (!contact || !contact.name) {
    return '*';
  }
  return contact.name;
};

const getLineage = (contactDict, { parent }, lineage = '', depth = 0) => {
  if (!parent || depth === MAX_LINEAGE_DEPTH) {
    return lineage;
  }
  const name = getContactName(contactDict, parent._id);
  const newLineage = `${lineage}${lineage.length ? ' - ' : ''}${name}`;
  return getLineage(contactDict, parent, newLineage, depth + 1);
};

const compareByPlaceName = (a, b) => a[PLACE_NAME].localeCompare(b[PLACE_NAME]);

const getVlookupData = (contactDict, ids) => ids
  .map(id => contactDict[id])
  .map(contact => {
    const lineage = getLineage(contactDict, contact);
    const placeName = `${contact.name}${lineage ? ` (${lineage})` : ''}`;
    return {
      [PLACE_NAME]: placeName,
      [PLACE_UUID]: contact._id,
    };
  })
  .sort(compareByPlaceName);

const writeVlookupCsvFile = (json2csvParser, vlookupData, type) => {
  const csvDirPath = `${environment.pathToProject}/vlookup.csv`;
  if (!fs.exists(csvDirPath)) {
    fs.mkdir(csvDirPath);
  }
  const csv = json2csvParser.parse(vlookupData);
  fs.write(`${csvDirPath}/contact.${type}_VLOOKUP.csv`, csv);
};

module.exports = {
  requiresInstance: true,
  execute: async () => {
    const api = API();
    const db = DB();
    const json2csvParser = new Json2csvParser({
      fields: [PLACE_NAME, PLACE_UUID],
      doubleQuote: '\'',
      flatten: true
    });

    const contactsByIdDict = {};
    const idsByTypeDict = {};
    for (const placeType of await getPlaceTypes(db)) {
      const placesIdentData = await getIdentDataForPlaces(db, api, placeType);
      info(`Fetching data for ${placesIdentData.length} ${placeType} contacts...`);
      const contactDict = await getContactDictionary(db, placesIdentData);
      Object.assign(contactsByIdDict, contactDict);
      idsByTypeDict[placeType] = Object.keys(contactDict);
    }
    for (const [type, ids] of Object.entries(idsByTypeDict)) {
      const vlookupData = getVlookupData(contactsByIdDict, ids);
      writeVlookupCsvFile(json2csvParser, vlookupData, type);
    }
  }
};
