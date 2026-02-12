const contactSummary = require('contact-summary.templated.js');
const cardsExtensions = require('cht-cards-extensions-shim.js');
const contactSummaryEmitter = require('./contact-summary-emitter');

// Merge *.contact-summary.js extensions
let baseCards = contactSummary.cards || [];
let baseContext = contactSummary.context || {};
let baseFields = contactSummary.fields || [];

// Extension can export: { cards: [...], context: {...}, fields: [...] } or just an array of cards
function mergeExtension(extModule) {
  if (!extModule) {
    return;
  }
  if (Array.isArray(extModule)) {
    baseCards = baseCards.concat(extModule);
    return;
  }
  if (Array.isArray(extModule.cards)) {
    baseCards = baseCards.concat(extModule.cards);
  }
  if (Array.isArray(extModule.fields)) {
    baseFields = baseFields.concat(extModule.fields);
  }
  if (typeof extModule.context === 'object') {
    Object.assign(baseContext, extModule.context);
  }
}

cardsExtensions.forEach(mergeExtension);

contactSummary.cards = baseCards;
contactSummary.context = baseContext;
contactSummary.fields = baseFields;

module.exports = contactSummaryEmitter(contactSummary, contact, reports);
