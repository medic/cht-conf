const contactSummary = require('contact-summary.templated.js');
const cardsExtensions = require('cht-cards-extensions-shim.js');
const contactSummaryEmitter = require('./contact-summary-emitter');

// Merge *.contact-summary.js extensions
let baseCards = contactSummary.cards || [];
let baseContext = contactSummary.context || {};
let baseFields = contactSummary.fields || [];

cardsExtensions.forEach(function(extModule) {
  if (!extModule) {
    return;
  }
  // Extension can export: { cards: [...], context: {...}, fields: [...] } or just an array of cards
  if (Array.isArray(extModule)) {
    baseCards = baseCards.concat(extModule);
  } else {
    if (Array.isArray(extModule.cards)) {
      baseCards = baseCards.concat(extModule.cards);
    }
    // Merge context object (extension properties override base if same key)
    if (extModule.context && typeof extModule.context === 'object') {
      Object.keys(extModule.context).forEach(function(key) {
        baseContext[key] = extModule.context[key];
      });
    }
    // Merge fields array
    if (Array.isArray(extModule.fields)) {
      baseFields = baseFields.concat(extModule.fields);
    }
  }
});

contactSummary.cards = baseCards;
contactSummary.context = baseContext;
contactSummary.fields = baseFields;

module.exports = contactSummaryEmitter(contactSummary, contact, reports);
