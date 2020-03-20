var prepareDefinition = require('./definition-preparation');

function targetEmitter(targets, c, Utils, Target, emit) {
  for (var idx1 = 0; idx1 < targets.length; ++idx1) {
    var target = targets[idx1];
    prepareDefinition(target);

    switch (target.appliesTo) {
      case 'contacts':
        emitTargetFor(target, Target, Utils, emit, c);
        break;
      case 'reports':
        for (var idx2 = 0; idx2 < c.reports.length; ++idx2) {
          var r = c.reports[idx2];
          emitTargetFor(target, Target, Utils, emit, c, r);
        }
        break;
      default:
        throw new Error('Unrecognised target.appliesTo: ' + target.appliesTo);
    }
  }
}

function getDaysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function determineDates(targetConfig, Utils, c, r) {
  if (typeof targetConfig.date === 'function') {
    return targetConfig.date(c, r);
  }

  if (targetConfig.date === undefined || targetConfig.date === 'now') {
    var now = Utils.now();
    var daysInMonth = getDaysInMonth(now);
    var lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    var daysInPreviousMonth = getDaysInMonth(lastMonth);
    return [
      Utils.addDate(now, daysInPreviousMonth * -1).getTime(),
      now.getTime(),
      Utils.addDate(now, daysInMonth).getTime(),
    ];
  }

  if (targetConfig.date === 'reported') {
    return r ? r.reported_date : c.contact.reported_date;
  }

  throw new Error('Unrecognised value for target.date: ' + targetConfig.date);
}

function determineInstanceIds(targetConfig, c, r) {
  var instanceIds;
  if (typeof targetConfig.idType === 'function') {
    instanceIds = targetConfig.idType(c, r);
  } else if (targetConfig.idType === 'report') {
    instanceIds = r && r._id;
  } else {
    instanceIds = c.contact && c.contact._id;
  }

  if (!Array.isArray(instanceIds)) {
    instanceIds = [instanceIds];
  }

  return instanceIds;
}

function emitTargetFor(targetConfig, Target, Utils, emit, c, r) {
  var isEmittingForReport = !!r;
  if (!c.contact) return;
  var contactType = c.contact.contact_type || c.contact.type;
  var appliesToKey = isEmittingForReport ? r.form : contactType;
  if (targetConfig.appliesToType && targetConfig.appliesToType.indexOf(appliesToKey) < 0) return;
  if (targetConfig.appliesIf && !targetConfig.appliesIf (c, r)) return;

  var instanceDoc = isEmittingForReport ? r : c.contact;
  var instanceIds = determineInstanceIds(targetConfig, c, r);
  var pass = !targetConfig.passesIf || !!targetConfig.passesIf(c, r);
  var dates = determineDates(targetConfig, Utils, c, r);
  dates = Array.isArray(dates) ? dates : [dates];
  var groupBy = targetConfig.groupBy && targetConfig.groupBy(c, r);
  function emitTargetInstance(i) {
    emit('target', i);
  }

  for (var i = 0; i < instanceIds.length; ++i) {
    dates.forEach(function(date) {
      var instance = new Target({
        _id: instanceIds[i] + '~' + targetConfig.id + (dates.length > 1 ? '~' + date : ''),
        contact: c.contact,
        deleted: !!instanceDoc.deleted,
        type: targetConfig.id,
        pass: pass,
        groupBy: groupBy,
        date: date,
      });

      if (targetConfig.emitCustom) {
        targetConfig.emitCustom(emitTargetInstance, instance, c, r);
      } else {
        emitTargetInstance(instance);
      }
    });
  }
}

module.exports = targetEmitter;
