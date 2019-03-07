function bindToContext(toBind, context) {
  if (toBind && typeof toBind === 'function') {
    toBind = toBind.bind(context);
  }
  return toBind;
}
function bindTargetToContext(target) {
  // TODO: Deep copy
  const context = { definition: Object.assign({}, target) };
  ['passesIf', 'appliesIf', 'idType', 'emitCustom'].forEach(function (toBind) {
    target[toBind] = bindToContext(target[toBind], context);
  });
  return target;
}

function bindTaskToContext(task) {
  const context = { definition: Object.assign({}, task) };
  ['appliesIf', 'resolvedIf' ].forEach(function (toBind) {
    task[toBind] = bindToContext(task[toBind], context);
  });

  if (Array.isArray(task.events)) {
    for (let event of task.events) {
      if (event.dueDate) {
        event.dueDate = bindToContext(event.dueDate, context); 
      }
    }
  }

  if (Array.isArray(task.actions)) {
    for (let action of task.actions) {
      if (action.modifyContent) {
        action.modifyContent = bindToContext(action.modifyContent, context);
      }
    }
  }
  
  return task;
}

for(idx1=0; idx1<targets.length; ++idx1) {
  target = bindTargetToContext(targets[idx1]);
  switch(target.appliesTo) {
    case 'contacts':
      if(c.contact && (!target.appliesToType || target.appliesToType.indexOf(c.contact.type) !== -1)) {
        emitContactBasedTargetFor(c, target);
      }
      break;
    case 'reports':
      for(idx2=0; idx2<c.reports.length; ++idx2) {
        r = c.reports[idx2];
        if (!target.appliesToType || target.appliesToType.indexOf(r.form) !== -1) {
          emitReportBasedTargetFor(c, r, target);
        }
      }
      break;
    default:
      throw new Error('Unrecognised appliesTo value: ' + target.appliesTo);
  }
}

if(tasks) {
  for(idx1=0; idx1<tasks.length; ++idx1) {
    var task = bindTaskToContext(tasks[idx1]);
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
    var i, dueDate = null, event, priority, task, emitted = 0;
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
          dueDate = event.dueDate(c, event, scheduledTaskIdx);
        } else {
          // The default is the day the user was created?? That makes no sense.
          dueDate = new Date(Utils.addDate(new Date(c.contact.reported_date), event.days));
        }
      }

      const isTimely = Utils.isTimely(dueDate, event);
      if (!isTimely) {
        continue;
      }

      task = {
        // One task instance for each event per form that triggers a task, not per contact
        // Otherwise they collide when contact has multiple reports of the same form
        _id: `${r ? r._id : c && c.contact && c.contact._id}-${schedule.id}-${event.id || i}`,
        deleted: !!((c.contact && c.contact.deleted) || r ? r.deleted : false),
        doc: c,
        contact: c.contact,
        icon: schedule.icon,
        date: dueDate,
        title: schedule.title,
        resolved: (!!schedule.maxVisibleTasks && emitted >= schedule.maxVisibleTasks) || schedule.resolvedIf(c, r, event, dueDate, scheduledTaskIdx),
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

      if (!task.resolved) {
        emitted++;
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

    if(def.modifyContent) def.modifyContent(r || c, content);

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
    instance.date = c.contact.reported_date;
  } else {
    throw new Error('Unrecognised value for target.date: ' + targetConfig.date);
  }
  
  if(targetConfig.emitCustom) {
    targetConfig.emitCustom(c, instance);
    return;
  }

  emitTargetInstance(instance);
}

function emitReportBasedTargetFor(c, r, targetConf) {
  if(targetConf.appliesIf && !targetConf.appliesIf(c, r)) return;

  const pass = !targetConf.passesIf || !!targetConf.passesIf(c, r);
  const instance = createTargetInstance(targetConf.id, r, pass);

  const idPrefix =
    typeof targetConf.idType === 'function' ? targetConf.idType(c, r) :
    targetConf.idType === 'report' ? r._id :
    !!c.contact ? c.contact._id :
    'no-contact';
  instance._id = idPrefix + '-' + targetConf.id;
  if (targetConf.date === 'now') {
    instance.date = now.getTime();
  }

  if(targetConf.emitCustom) {
    targetConf.emitCustom(c, r, instance);
    return;
  }
  emitTargetInstance(instance);
}

function createTargetInstance(type, doc, pass) {
  return new Target({
    _id: doc._id + '-' + type,
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
