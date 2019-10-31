function emitter(contactSummary, contact, reports) {
  var fields = contactSummary.fields || [];
  var context = contactSummary.context || {};
  var cards = contactSummary.cards || [];

  var contactType = contact && (contact.contact_type || contact.type);

  var result = {
    cards: [],
    fields: fields.filter(function(f) {
      if (f.appliesToType === contactType ||
          (f.appliesToType.charAt(0) === '!' && f.appliesToType.slice(1) !== contactType)) {
        if (!f.appliesIf || f.appliesIf()) {
          delete f.appliesToType;
          delete f.appliesIf;
          return true;
        }
      }
    }),
  };

  cards.forEach(function(card) {
    var idx1, r, added;

    if (card.appliesToType === 'report') {
      for (idx1=0; idx1<reports.length; ++idx1) {
        r = reports[idx1];
        if (!isReportValid(r)) {
          continue;
        }

        added = addCard(card, context, r);
        if (added) {
          result.cards.push(added);
        }
      }
    } else {
      if (contactType !== card.appliesToType) {
        return;
      }

      added = addCard(card, context);
      if (added) {
        result.cards.push(added);
      }
    }
  });

  result.context = context;

  // return the result for 2.13+ as per #2635
  return result;
}

function isReportValid(report) {
  // valid XForms won't have .errors field
  // valid JSON forms will have empty array errors:[]
  return report && !(report.errors && report.errors.length);
}

function addCard(card, context, r) {
  if (!card.appliesIf(r)) return;

  function addValue(src, dst, prop) {
    switch(typeof src[prop]) {
      case 'undefined': return;
      case 'function': dst[prop] = src[prop](r); break;
      default: dst[prop] = src[prop];
    }
  }

  var fields = typeof card.fields === 'function' ?
      card.fields(r) :
      card.fields
        .filter(function(f) {
          switch(typeof f.appliesIf) {
            case 'undefined': return true;
            case 'function':  return f.appliesIf(r);
            default:          return f.appliesIf;
          }
        })
        .map(function(f) {
          var ret = {};
          addValue(f, ret, 'label');
          addValue(f, ret, 'value');
          addValue(f, ret, 'translate');
          addValue(f, ret, 'filter');
          addValue(f, ret, 'width');
          addValue(f, ret, 'icon');
          if (f.context) {
            ret.context = {};
            addValue(f.context, ret.context, 'count');
            addValue(f.context, ret.context, 'total');
          }
          return ret;
        });

  if (card.modifyContext) {
    card.modifyContext(context, r);
  }

  return {
    label: card.label,
    fields: fields,
  };
}

module.exports = emitter;
