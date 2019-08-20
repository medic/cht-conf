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

function emitTargetFor(targetConfig, Target, Utils, emit, c, r) {
  var isEmittingForReport = !!r;
  if (!c.contact) return;
  var appliesToKey = isEmittingForReport ? r.form : c.contact.type;
  if (targetConfig.appliesToType && targetConfig.appliesToType.indexOf(appliesToKey) < 0) return;
  if (targetConfig.appliesIf && !targetConfig.appliesIf (c, r)) return;

  var instanceId;
  if (typeof targetConfig.idType === 'function') {
    instanceId = targetConfig.idType(c, r);
  } else if (targetConfig.idType === 'report') {
    instanceId = r && r._id;
  } else {
    instanceId = c.contact && c.contact._id;
  }
  
  var instanceDoc = isEmittingForReport ? r : c.contact;
  var pass = !targetConfig.passesIf || !!targetConfig.passesIf(c, r);
  var instance = new Target({
    _id: instanceId + '~' + targetConfig.id,
    deleted: !!instanceDoc.deleted,
    type: targetConfig.id,
    pass: pass,
    date: instanceDoc.reported_date,
  });

  if (typeof targetConfig.date === 'function') {
    instance.date = targetConfig.date(c, r);
  } else if (targetConfig.date === undefined || targetConfig.date === 'now') {
    instance.date = Utils.now().getTime();
  } else if (targetConfig.date === 'reported') {
    instance.date = isEmittingForReport ? r.reported_date : c.contact.reported_date;
  } else {
    throw new Error('Unrecognised value for target.date: ' + targetConfig.date);
  }

  function emitTargetInstance(i) {
    emit('target', i);
  }

  if (targetConfig.emitCustom) {
    targetConfig.emitCustom(emitTargetInstance, instance, c, r);
    return;
  }

  emitTargetInstance(instance);
}

module.exports = targetEmitter;
