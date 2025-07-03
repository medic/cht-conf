// eslint-disable-next-line n/no-missing-require
const contactSummary = require('contact-summary.templated.js');
const contactSummaryEmitter = require('./contact-summary-emitter');

module.exports = contactSummaryEmitter(contactSummary, contact, reports);
