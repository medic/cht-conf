function bindAllFunctionsToContext(obj, context) {
  var keys = Object.keys(obj);
  for (var i in keys) {
    var key = keys[i];
    switch(typeof obj[key]) {
      case 'object':
        bindAllFunctionsToContext(obj[key], context);
        break;
      case 'function':
        obj[key] = obj[key].bind(context);
        break;
    }
  }
}

function deepCopy(obj) {
  var copy = Object.assign({}, obj);
  var keys = Object.keys(copy);
  for (var i in keys) {
    var key = keys[i];
    if (Array.isArray(copy[key])) {
      copy[key] = copy[key].slice(0);
      for (var j = 0; j < copy[key].length; ++j) {
        if (typeof copy[key][j] === 'object') {
          copy[key][j] = deepCopy(copy[key][j]);
        }
      }
    } else if (typeof copy[key] === 'object') {
      copy[key] = deepCopy(copy[key]);
    }
  }
  return copy;
}

for(idx1=0; idx1<targets.length; ++idx1) {
  target = targets[idx1];
  var targetContext = {};
  bindAllFunctionsToContext(target, targetContext);
  targetContext.definition = deepCopy(target);

  switch(target.appliesTo) {
    case 'contacts':
      emitTargetFor(target, c);
      break;
    case 'reports':
      for(idx2=0; idx2<c.reports.length; ++idx2) {
        r = c.reports[idx2];
        emitTargetFor(target, c, r);
      }
      break;
    default:
      throw new Error('unrecognised target type: ' + target.appliesTo);
  }
}

if(tasks) {
  for(idx1=0; idx1<tasks.length; ++idx1) {
    var task = tasks[idx1];
    task.index = idx1;
    var taskContext = {};
    bindAllFunctionsToContext(task, taskContext);
    taskContext.definition = deepCopy(task);

    switch(task.appliesTo) {
      case 'reports':
      case 'scheduled_tasks':
        for(idx2=0; idx2<c.reports.length; ++idx2) {
          r = c.reports[idx2];
          emitTasksForSchedule(c, task, r);
        }
        break;
      case 'contacts':
        if(c.contact && task.appliesToType.indexOf(c.contact.type) !== -1) {
          emitTasksForSchedule(c, task);
        }
        break;
      default:
        throw new Error('unrecognised task type: ' + task.appliesTo);
    }
  }
}

function emitTasksForSchedule(c, schedule, r) {
  var i;

  if(r && schedule.appliesToType && schedule.appliesToType.indexOf(r.form) === -1) {
    return;
  }

  if(schedule.appliesTo !== 'scheduled_tasks' &&
      schedule.appliesIf && !schedule.appliesIf(c, r)) {
    return;
  }

  if(schedule.appliesTo === 'scheduled_tasks'){
    if(r && schedule.appliesIf) {
      if(!r.scheduled_tasks) {
        return;
      }
      for (i = 0; i < r.scheduled_tasks.length; i++) {
        if(schedule.appliesIf(c, r, i)) {
          emitForEvents(i);
        }
      }
    }
  } else {
    emitForEvents();
  }

  function emitForEvents(scheduledTaskIdx) {
    var i, dueDate = null, event, priority, task;
    for (i = 0; i < schedule.events.length; i++) {
      event = schedule.events[i];

      if(r) {
        if(event.dueDate) {
          dueDate = event.dueDate(r, event, scheduledTaskIdx);
        } else if(scheduledTaskIdx !== undefined) {
          dueDate = new Date(Utils.addDate(new Date(r.scheduled_tasks[scheduledTaskIdx].due), event.days));
        } else {
          dueDate = new Date(Utils.addDate(new Date(r.reported_date), event.days));
        }
      } else {
        if(event.dueDate) {
          dueDate = event.dueDate(c.contact, event, scheduledTaskIdx);
        } else {
          dueDate = new Date(Utils.addDate(new Date(c.contact.reported_date), event.days));
        }
      }

      if (!Utils.isTimely(dueDate, event)) {
        continue;
      }

      task = {
        // One task instance for each event per form that triggers a task, not per contact
        // Otherwise they collide when contact has multiple reports of the same form
        _id: (r ? r._id : c.contact && c.contact._id) + '~' + (event.id || i) + '~' + (schedule.name || schedule.index),
        deleted: !!((c.contact && c.contact.deleted) || r ? r.deleted : false),
        doc: c,
        contact: c.contact,
        icon: schedule.icon,
        date: dueDate,
        title: schedule.title,
        resolved: schedule.resolvedIf(c, r, event, dueDate, scheduledTaskIdx),
        actions: schedule.actions.map(initActions),
      };

      if(scheduledTaskIdx !== undefined) {
        task._id += '-' + scheduledTaskIdx;
      }

      priority = schedule.priority;
      if(typeof priority === 'function') {
        priority = priority(c, r);
      }
      if(priority) {
        task.priority = priority.level;
        task.priorityLabel = priority.label;
      }

      emit('task', new Task(task));
    }
  }

  function initActions(def) {
    var appliesToReport = !!r;
    var content = {
      source: 'task',
      source_id: appliesToReport ? r._id : c.contact && c.contact._id,
      contact: c.contact,
    };

    if(def.modifyContent) def.modifyContent(content, c, r);

    return {
      type: 'report',
      form: def.form,
      label: def.label || 'Follow up',
      content: content,
    };
  }
}

function emitTargetFor(targetConfig, c, r) {
  var isEmittingForReport = !!r;
  if (!c.contact) return;
  var appliesToKey = isEmittingForReport ? r.form : c.contact.type;
  if (targetConfig.appliesToType && targetConfig.appliesToType.indexOf(appliesToKey) < 0) return;
  if (targetConfig.appliesIf && !targetConfig.appliesIf(c, r)) return;

  var pass = !targetConfig.passesIf || !!targetConfig.passesIf(c, r);
  var instanceDoc = isEmittingForReport ? r : c.contact;
  var instance = createTargetInstance(targetConfig.id, instanceDoc, pass);

  instance._id = (targetConfig.idType === 'report' ? r && r._id : c.contact._id) + '~' + targetConfig.id;

  if(typeof targetConfig.date === 'function') {
    instance.date = targetConfig.date(c, r);
  } else if(targetConfig.date === undefined || targetConfig.date === 'now') {
    instance.date = now.getTime();
  } else if(targetConfig.date === 'reported') {
    instance.date = isEmittingForReport ? r.reported_date : c.contact.reported_date;
  } else {
    throw new Error('Unrecognised value for target.date: ' + targetConfig.date);
  }

  if(targetConfig.emitCustom) {
    targetConfig.emitCustom(instance, c, r);
    return;
  }

  emitTargetInstance(instance);
}

function createTargetInstance(type, doc, pass) {
  return new Target({
    _id: doc._id + '~' + type,
    deleted: !!doc.deleted,
    type: type,
    pass: pass,
    date: doc.reported_date
  });
}

function emitTargetInstance(i) {
  emit('target', i);
}

emit('_complete', { _id: true });
