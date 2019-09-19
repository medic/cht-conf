const fs = require('../lib/sync-fs');
const { trace } = require('../lib/log');
const uuid = require('uuid/v4');

module.exports = (projectDir, db, api, extras) => {
  const csvFiles = extras || ['sms.csv'];

  trace('upload-sms-from-csv', 'csv files:', csvFiles);
  
  return csvFiles.map(fileName => `${projectDir}/${fileName}`)
    .reduce((promiseChain, csvFile) => {
      trace(`Processing csv file ${csvFile}…`);
      const raw = fs.readCsv(csvFile);

      const messages = raw.rows.map(row => {
      const valueOf = column => row[raw.cols.indexOf(column)];

      return {
        id:           uuid(),
        from:         valueOf('from'),
        content:      valueOf('message'),
        sms_sent:     valueOf('sent_timestamp') || Date.now(),
        sms_received: Date.now(),
      };
    });

    return api.uploadSms(messages);
  }, Promise.resolve());
};
