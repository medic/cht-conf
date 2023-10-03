const prepareDefinition = require('./definition-preparation');
const taskDefaults = require('./task-defaults');
const getRecurringTasks = require('./task-recurring');

function taskEmitter(taskDefinitions, c, Utils, Task, emit) {
  if (!taskDefinitions) return;

  for (let idx1 = 0; idx1 < taskDefinitions.length; ++idx1) {
    const taskDefinition = Object.assign({}, taskDefinitions[idx1], taskDefaults);
    if (typeof taskDefinition.resolvedIf !== 'function') {
      taskDefinition.resolvedIf = function (contact, report, event, dueDate) {
        return taskDefinition.defaultResolvedIf(contact, report, event, dueDate, Utils);
      };
    }
    prepareDefinition(taskDefinition);

    const emitterContext = {
      taskDefinition,
      c,
      Utils,
      Task,
      emit,
    };

    switch (taskDefinition.appliesTo) {
      case 'reports':
      case 'scheduled_tasks':
        for (const report of c.reports) {
          emitterContext.r = report;
          emitTaskDefinition(emitterContext);
        }
        break;
      case 'contacts':
        if (c.contact) {
          emitTaskDefinition(emitterContext);
        }
        break;
      default:
        throw new Error('Unrecognised task.appliesTo: ' + taskDefinition.appliesTo);
    }
  }
}

function emitTaskDefinition(emitterContext) {
  const { taskDefinition, c, r } = emitterContext;

  if (taskDefinition.appliesToType) {
    let type;
    if (taskDefinition.appliesTo === 'contacts') {
      if (!c.contact) {
        // no assigned contact - does not apply
        return;
      }
      type = c.contact.type === 'contact' ? c.contact.contact_type : c.contact.type;
    } else {
      if (!r) {
        // no report - does not apply
        return;
      }
      type = r.form;
    }
    if (taskDefinition.appliesToType.indexOf(type) === -1) {
      // does not apply to this type
      return;
    }
  }

  if (taskDefinition.appliesTo !== 'scheduled_tasks' && taskDefinition.appliesIf && !taskDefinition.appliesIf(c, r)) {
    return;
  }

  if (taskDefinition.appliesTo === 'scheduled_tasks'){
    if (r && taskDefinition.appliesIf) {
      if (!r.scheduled_tasks) {
        return;
      }

      for (let i = 0; i < r.scheduled_tasks.length; i++) {
        if (taskDefinition.appliesIf(c, r, i)) {
          emitForEvents(emitterContext, i);
        }
      }
    }
  } else {
    emitForEvents(emitterContext);
  }

  function obtainContactLabelFromSchedule(taskDefinition, c, r) {
    let contactLabel;
    if (typeof taskDefinition.contactLabel === 'function') {
      contactLabel = taskDefinition.contactLabel(c, r);
    } else {
      contactLabel = taskDefinition.contactLabel;
    }

    return contactLabel ? { name: contactLabel } : c.contact;
  }

  function emitForEvents(emitterContext, scheduledTaskIdx) {
    let emissionInfo;
    if (Array.isArray(taskDefinition.events)) {
      emissionInfo = emitEventsArray(emitterContext, scheduledTaskIdx);
    } else {
      if (scheduledTaskIdx) {
        throw Error('appliesTo: "scheduled_tasks" is not supported with recurring tasks');
      }

      emissionInfo = getRecurringTasks(emitterContext);
    }

    emissionInfo.forEach(emission => {
      emitTaskEvent(emitterContext, emission);
    });
  }

  function emitEventsArray(emitterContext, scheduledTaskIdx) {
    const { Utils } = emitterContext;
    const result = [];
    let dueDate = null;
    for (let i = 0; i < taskDefinition.events.length; i++) {
      const event = taskDefinition.events[i];

      if (event.dueDate) {
        dueDate = event.dueDate(event, c, r, scheduledTaskIdx);
      } else if (r) {
        if (scheduledTaskIdx !== undefined) {
          dueDate = new Date(Utils.addDate(new Date(r.scheduled_tasks[scheduledTaskIdx].due), event.days));
        } else {
          dueDate = new Date(Utils.addDate(new Date(r.reported_date), event.days));
        }
      } else {
        if (event.dueDate) {
          dueDate = event.dueDate(event, c);
        } else {
          const defaultDueDate = c.contact && c.contact.reported_date ? new Date(c.contact.reported_date) : new Date();
          dueDate = new Date(Utils.addDate(defaultDueDate, event.days));
        }
      }

      const uuidPrefix = r ? r._id : c.contact && c.contact._id;
      result.push({
        _id: `${uuidPrefix}~${event.id || i}~${taskDefinition.name}`,
        date: dueDate,
        event,
      });
    }

    return result;
  }

  function emitTaskEvent(emitterContext, emissionInfo, scheduledTaskIdx) {
    const { taskDefinition, Utils, c, r, emit, Task } = emitterContext;

    if (!emissionInfo._id) {
      throw 'emissionInfo._id';
    }

    if (!emissionInfo.date) {
      throw 'emissionInfo.date';
    }

    if (!emissionInfo.event) {
      throw 'emissionInfo.event';
    }

    const { event, date: dueDate } = emissionInfo;
    if (!Utils.isTimely(dueDate, event)) {
      return;
    }
  
    const defaultEmission = {
      // One task instance for each event per form that triggers a task, not per contact
      // Otherwise they collide when contact has multiple reports of the same form
      deleted: !!((c.contact && c.contact.deleted) || r ? r.deleted : false),
      doc: c,
      contact: obtainContactLabelFromSchedule(taskDefinition, c, r),
      icon: taskDefinition.icon,
      readyStart: event.start || 0,
      readyEnd: event.end || 0,
      title: taskDefinition.title,
      resolved: taskDefinition.resolvedIf(c, r, event, dueDate, scheduledTaskIdx),
      actions: initActions(taskDefinition.actions, event),
    };
    
    if (scheduledTaskIdx !== undefined) {
      defaultEmission._id += '-' + scheduledTaskIdx;
    }
  
    let priority = taskDefinition.priority;
    if (typeof priority === 'function') {
      priority = priority(c, r);
    }
  
    if (priority) {
      defaultEmission.priority = priority.level;
      defaultEmission.priorityLabel = priority.label;
    }
  
    const emission = Object.assign({}, defaultEmission, emissionInfo);
    delete emission.event;
    emit('task', new Task(emission));
  }

  function initActions(actions, event) {
    return actions.map(function(action) {
      return initAction(action, event);
    });
  }

  function initAction(action, event) {
    const appliesToReport = !!r;
    const content = {
      source: 'task',
      source_id: appliesToReport ? r._id : c.contact && c.contact._id,
      contact: c.contact,
    };

    if (action.modifyContent) {
      action.modifyContent(content, c, r, event);
    }

    return {
      type: action.type || 'report',
      form: action.form,
      label: action.label || 'Follow up',
      content: content,
    };
  }
}


module.exports = taskEmitter;
