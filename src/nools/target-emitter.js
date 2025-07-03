const prepareDefinition = require('./definition-preparation');

function targetEmitter(targets, c, Utils, Target, emit) {
  for (let idx1 = 0; idx1 < targets.length; ++idx1) {
    const target = targets[idx1];
    prepareDefinition(target);

    switch (target.appliesTo) {
    case 'contacts':
      emitTargetFor(target, Target, Utils, emit, c);
      break;
    case 'reports':
      for (let idx2 = 0; idx2 < c.reports.length; ++idx2) {
        const r = c.reports[idx2];
        emitTargetFor(target, Target, Utils, emit, c, r);
      }
      break;
    default:
      throw new Error('Unrecognised target.appliesTo: ' + target.appliesTo);
    }
  }
}

function determineDate(targetConfig, Utils, c, r) {
  if (typeof targetConfig.date === 'function') {
    return targetConfig.date(c, r) || Utils.now().getTime();
  }

  if (targetConfig.date === undefined || targetConfig.date === null || targetConfig.date === 'now') {
    return Utils.now().getTime();
  }

  if (targetConfig.date === 'reported') {
    return r ? r.reported_date : c.contact.reported_date;
  }

  throw new Error('Unrecognised value for target.date: ' + targetConfig.date);
}

function determineInstanceIds(targetConfig, c, r) {
  let instanceIds;
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
  const isEmittingForReport = !!r;
  if (!c.contact) {
    return;
  }
  const contactType = c.contact.type === 'contact' ? c.contact.contact_type : c.contact.type;
  const appliesToKey = isEmittingForReport ? r.form : contactType;
  if (targetConfig.appliesToType && targetConfig.appliesToType.indexOf(appliesToKey) < 0) {
    return;
  }
  if (targetConfig.appliesIf && !targetConfig.appliesIf(c, r)) {
    return;
  }

  const instanceDoc = isEmittingForReport ? r : c.contact;
  const instanceIds = determineInstanceIds(targetConfig, c, r);
  const pass = !targetConfig.passesIf || !!targetConfig.passesIf(c, r);
  const date = determineDate(targetConfig, Utils, c, r);
  const groupBy = targetConfig.groupBy && targetConfig.groupBy(c, r);

  function emitTargetInstance(i) {
    emit('target', i);
  }

  for (let i = 0; i < instanceIds.length; ++i) {
    const instance = new Target({
      _id: instanceIds[i] + '~' + targetConfig.id,
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
  }
}

module.exports = targetEmitter;
