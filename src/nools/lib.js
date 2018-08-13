var place = ['health_center', 'district_hospital', 'clinic'];

for(idx1=0; idx1<targets.length; ++idx1) {
  target = targets[idx1];
  if(target.appliesTo === 'contacts') {
    if(c.contact && c.contact.type === 'person' &&
      target.appliesToType.includes('person')) {
      emitContactBasedTargetFor(c, target);
    }
    if(c.contact && place.includes(c.contact.type) &&
      target.appliesToType.includes(c.contact.type)) {
      emitContactBasedTargetFor(c, target);
    }
  } else if(target.appliesTo === 'reports') {
    for(idx2=0; idx2<c.reports.length; ++idx2) {
      r = c.reports[idx2];
      emitReportBasedTargetFor(c, r, target);
    }
  }
}

if(tasks) {
  for(idx1=0; idx1<tasks.length; ++idx1) {
    var task = tasks[idx1];
    if((task.appliesTo === 'reports' ||
        task.appliesTo=== 'scheduled_tasks') && c.reports) {
      for(idx2=0; idx2<c.reports.length; ++idx2) {
        r = c.reports[idx2];
        emitTasksForSchedule(c, tasks[idx1], r);
      }
    } else if(c.contact && c.contact.type === 'person' &&
              task.appliesTo === 'contacts' &&
              task.appliesToType.includes('person')) {
      emitTasksForSchedule(c, tasks[idx1]);
    } else if(c.contact && place.includes(c.contact.type) &&
              task.appliesTo === 'contacts' &&
              task.appliesToType.includes(c.contact.type)) {
      emitTasksForSchedule(c, tasks[idx1]);
    }
  }
}

function emitTasksForSchedule(c, schedule, r) {
  var i;

  if(schedule.appliesToForms && !schedule.appliesToForms.includes(r.form)) {
    return;
  }
  if(schedule.appliesIf && !schedule.appliesIf(c, r)) {
    return;
  }

  if(r && schedule.appliesIf) {
    if(!r.scheduled_tasks) {
      return;
    }
    for (i = 0; i < r.scheduled_tasks.length; i++) {
      if(schedule.appliesIf(r, i)) {
        emitForEvents(i);
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
        resolved: r ? schedule.resolvedIf(c, r, event, dueDate, scheduledTaskIdx) : false,
        actions: r ? schedule.actions.map(initActions) : [],
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
    return {
      type: 'report',
      form: def.form,
      label: def.label || 'Follow up',
      content: {
        source: 'task',
        source_id: r._id,
        contact: c.contact,
      },
    };
  }
}

// function emitTasksForPerson(c, r, schedule) {
// }
//
// function emitTasksForPlace(c, r, schedule) {
// }

function emitContactBasedTargetFor(c, targetConfig) {
  if(targetConfig.appliesIf && !targetConfig.appliesIf(c)) return;

  var pass = !targetConfig.passesIf || !!targetConfig.passesIf(c);

  var instance = createTargetInstance(targetConfig.id, c.contact, pass);
  instance.date = targetConfig.date ? targetConfig.date(c) : now.getTime(); emitTargetInstance(instance);
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
  instance._id = (targetConf.idType === 'report' ? r._id : c.contact._id) + '-' + targetConf.id;
  emitTargetInstance(instance);
  switch(targetConf.date) {
    case 'now': instance.date = now.getTime(); break;
  }
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
