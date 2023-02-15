const csvParse = require('csv-parse/lib/sync');
const Json2csvParser = require('json2csv').Parser;
const API = require('../lib/api');
const DB = require('../lib/db');
const fs = require('../lib/sync-fs');
const environment = require('../lib/environment');

const BATCH_SIZE = 2;
const PLACE_NAME = 'Place Name';
const PLACE_UUID = 'Place UUID';

const getPlaceTypes = async (db) => {
  const { settings: { contact_types } } = await db.get('settings');
  if (Array.isArray(contact_types) && contact_types.length) {
    return contact_types
      .filter(({ person }) => !person)
      .map(({ id }) => id);
  }
  return ['district_hospital', 'health_center', 'clinic'];
};

const getIdentDataForPlaces = async (db, api) => {
  const placeTypes = await getPlaceTypes(db);
  const contactsCsv = await api.getExport('contacts');
  return csvParse(contactsCsv, { columns: true })
    .filter(({ type }) => placeTypes.includes(type))
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
      .filter(({ _id, name, type }) => _id && name && type)
      .forEach(({ _id, name, type, parent }) => contactDict[_id] = { _id, name, type, parent });
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

const getLineage = (contactDict, { parent }, lineage = '') => {
  if (!parent) {
    return lineage;
  }
  const name = getContactName(contactDict, parent._id);
  const newLineage = `${lineage}${lineage.length ? ' - ' : ''}${name}`;
  return getLineage(contactDict, parent, newLineage);
};

const sortByPlaceName = contactsForType => contactsForType.sort((a, b) => a[PLACE_NAME].localeCompare(b[PLACE_NAME]));

const getVlookupDictionary = (contactDict) => {
  const vlookupDict = {};
  Object
    .values(contactDict)
    .forEach((contact) => {
      const lineage = getLineage(contactDict, contact);
      const placeName = `${contact.name}${lineage ? ` (${lineage})` : ''}`;
      const contactsForType = vlookupDict[contact.type] || [];
      contactsForType.push({
        [PLACE_NAME]: placeName,
        [PLACE_UUID]: contact._id,
      });
      vlookupDict[contact.type] = contactsForType;
    });

  Object
    .values(vlookupDict)
    .forEach(sortByPlaceName);
  return vlookupDict;
};

const writeVlookupCsvFiles = (vlookupDict) => {
  const json2csvParser = new Json2csvParser({
    fields: [PLACE_NAME, PLACE_UUID],
    doubleQuote: '\'',
    flatten: true
  });
  const csvDirPath = `${environment.pathToProject}/vlookup.csv`;
  if (!fs.exists(csvDirPath)) {
    fs.mkdir(csvDirPath);
  }

  Object
    .entries(vlookupDict)
    .forEach(([key, value]) => {
      const csv = json2csvParser.parse(value);
      fs.write(`${csvDirPath}/contact.${key}_VLOOKUP.csv`, csv);
    });
};

module.exports = {
  requiresInstance: true,
  execute: async () => {
    const api = API();
    const db = DB();

    const placesIdentData = await getIdentDataForPlaces(db, api);
    const contactDict = await getContactDictionary(db, placesIdentData);
    const vlookupDict = getVlookupDictionary(contactDict);
    writeVlookupCsvFiles(vlookupDict);
  }
};
