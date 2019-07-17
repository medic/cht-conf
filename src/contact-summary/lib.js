/* global contact, reports */

var contactSummary = require('contact-summary.templated.js');
var contactSummaryEmitter = require('./contact-summary-emitter');

return contactSummaryEmitter(contactSummary, contact, reports);