var contactSummary = require('contact-summary.templated.js');
var cardsExtensions = require('cht-cards-extensions-shim.js');
var contactSummaryEmitter = require('./contact-summary-emitter');

// Merge *.contact-summary.js extensions
var baseCards = contactSummary.cards || [];

cardsExtensions.forEach(function(extModule) {
  // Extension can export: { cards: [...] } or just an array
  if (Array.isArray(extModule)) {
    baseCards = baseCards.concat(extModule);
  } else if (extModule && Array.isArray(extModule.cards)) {
    baseCards = baseCards.concat(extModule.cards);
  }
});

contactSummary.cards = baseCards;

module.exports = contactSummaryEmitter(contactSummary, contact, reports);
