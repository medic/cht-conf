const fs = require('../lib/sync-fs');
const request = require('request-promise-native');
const trace = require('../lib/log').trace;
const uuid = require('uuid/v4');

module.exports = (projectDir, couchUrl, extras) => {
  const instanceUrl = couchUrl.replace(/\/medic$/, '');
  const csvFiles = extras || ['sms.csv'];

  trace('upload-sms-from-csv', 'csv files:', csvFiles);
  
  return csvFiles.map(fileName => `${projectDir}/${fileName}`)
    .reduce((promiseChain, csvFile) => {
      trace(`Processing csv file ${csvFile}…`);
      const raw = fs.readCsv(csvFile);

      const messages = raw.rows.map(row => ({
      	id:           uuid(),
	from:         row[raw.cols.indexOf('from')],
	content:      row[raw.cols.indexOf('message')],
	sms_sent:     Date.now(),
	sms_received: Date.now(),
      }));

      return request({
	uri: `${instanceUrl}/api/sms`,
	method: 'POST',
	json: true,
	body: { messages },
      });
    }, Promise.resolve());
};
