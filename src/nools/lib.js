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
  var targetContext = { definition: deepCopy(target) };
  bindAllFunctionsToContext(target, targetContext);
  switch(target.appliesTo) {
    case 'contacts':
      if(c.contact && target.appliesToType.indexOf(c.contact.type) !== -1) {
        emitContactBasedTargetFor(c, target);
      }
      break;
    case 'reports':
      for(idx2=0; idx2<c.reports.length; ++idx2) {
        r = c.reports[idx2];
        emitReportBasedTargetFor(c, r, target);
      }
      break;
    default:
      throw new Error('unrecognised target type: ' + target.appliesTo);
  }
}

if(tasks) {
  for(idx1=0; idx1<tasks.length; ++idx1) {
    var task = tasks[idx1];
    var taskContext = { definition: deepCopy(task) };
    bindAllFunctionsToContext(task, taskContext);
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

      if (event.dueDate) {
        dueDate = event.dueDate(event, c, r, scheduledTaskIdx);
      } else if(r) {
        if (scheduledTaskIdx !== undefined) {
          dueDate = new Date(Utils.addDate(new Date(r.scheduled_tasks[scheduledTaskIdx].due), event.days));
        } else {
          dueDate = new Date(Utils.addDate(new Date(r.reported_date), event.days));
        }
      } else {
        if(event.dueDate) {
          dueDate = event.dueDate(event, c);
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
        _id: r ? (r._id + '-' + event.id) : (c.contact._id + '-' + schedule.id),
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
    var content = {
      source: 'task',
      source_id: r && r._id,
      contact: c.contact,
    };

    if(def.modifyContent) def.modifyContent(r, content);

    return {
      type: 'report',
      form: def.form,
      label: def.label || 'Follow up',
      content: content,
    };
  }
}

function emitContactBasedTargetFor(c, targetConfig) {
  if(targetConfig.appliesIf && !targetConfig.appliesIf(c)) return;

  var pass = !targetConfig.passesIf || !!targetConfig.passesIf(c);

  var instance = createTargetInstance(targetConfig.id, c.contact, pass);
  if(typeof targetConfig.date === 'function') {
    instance.date = targetConfig.date(c);
  } else if(targetConfig.date === undefined || targetConfig.date === 'now') {
    instance.date = now.getTime();
  } else if(targetConfig.date === 'reported') {
    instance.date = c.reported_date;
  } else {
    throw new Error('Unrecognised value for target.date: ' + targetConfig.date);
  }
  emitTargetInstance(instance);
}

function emitReportBasedTargetFor(c, r, targetConf) {
  var instance, pass;
  if(targetConf.appliesIf && !targetConf.appliesIf(c, r)) return;

  if(targetConf.emitCustom) {
    targetConf.emitCustom(c, r);
    return;
  }

  pass = !targetConf.passesIf || !!targetConf.passesIf(c, r);
  instance = createTargetInstance(targetConf.id, r, pass);
  instance._id = (targetConf.idType === 'report' ? r._id : c.contact._id) + '~' + targetConf.id;
  emitTargetInstance(instance);
  switch(targetConf.date) {
    case 'now': instance.date = now.getTime(); break;
  }
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
