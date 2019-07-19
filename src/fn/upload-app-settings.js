const fs = require('../lib/sync-fs');
const request = require('request-promise-native');
const skipFn = require('../lib/skip-fn');

const SCHEMA_FILE_PREFIX = 'schema-';
const SCHEMA_FILE_EXT = '.bak';

module.exports = (projectDir, couchUrl) => {
  if(!couchUrl) return skipFn('no couch URL set');

  const isSchemaFile = name => name.startsWith(SCHEMA_FILE_PREFIX) && name.endsWith(SCHEMA_FILE_EXT);
  let schema_file = fs.readdir('.').find(isSchemaFile);
  if (!schema_file) schema_file = '';

  return request
    .put({
      method: 'PUT',
      url: `${couchUrl}/_design/medic/_rewrite/update_settings/medic?replace=1&schema=${schema_file}`,
      headers: { 'Content-Type':'application/json' },
      body: fs.read(`${projectDir}/app_settings.json`),
    })
    .then(JSON.parse)
    .then(json => {
      // As per https://github.com/medic/medic-webapp/issues/3674, this endpoint
      // will return 200 even when upload fails.
      if (!json.success) throw new Error(json.error);

      if (json.data.digest && json.data.schema){
        const schema_files = fs.readdir('.').filter(isSchemaFile);
        schema_files.forEach( f => fs.unlinkSync(f) );
        fs.write(SCHEMA_FILE_PREFIX.concat(json.data.digest, SCHEMA_FILE_EXT), json.data.schema);
      }
    });
};
