const fs = require('./sync-fs');
const jshintWithReport = require('./jshint-with-report');
const jsToString = require('./js-to-string');
const minifyJs = require('./minify-js');
const minifyNools = require('./minify-nools');
const parseTargets = require('./parse-targets');
const templatedJs = require('./templated-js');

function lint(code) {
  jshintWithReport('nools rules', code, {
    predef: [ 'c', 'emit', 'Contact', 'Target', 'Task', 'Utils' ],
  });
}

function compileWithDefaultLayout(projectDir) {
  checkForRequiredFilesForDefaultLayout(projectDir);

  const targets = parseTargets.js(projectDir);
  const tasks = fs.read(`${projectDir}/tasks.js`);
  const supportCode = fs.read(`${projectDir}/nools-extras.js`);

  const jsCode = templatedJs.fromString(projectDir, `
    var idx1, idx2, r, target;
    var now = Utils.now();
    ${supportCode}
    var targets = ${jsToString(targets)};
    var tasks = ${tasks};

    if (c.contact && c.contact.type === 'person') {
      for(idx1=0; idx1<targets.length; ++idx1) {
        target = targets[idx1];
        switch(target.appliesToType) {
          case 'person':
            emitPersonBasedTargetFor(c, target);
            break;
          case 'report':
            for(idx2=0; idx2<c.reports.length; ++idx2) {
              r = c.reports[idx2];
              emitReportBasedTargetFor(c, r, target);
            }
            break;
          default:
            throw new Error('unrecognised target type: ' + target.type);
        }
      }
      for(idx1=0; idx1<tasks.length; ++idx1) {
        // TODO currently we assume all tasks are report-based
        for(idx2=0; idx2<c.reports.length; ++idx2) {
          r = c.reports[idx2];
          emitTasksForSchedule(c, r, tasks[idx1]);
        }
      }
    }

    function emitTasksForSchedule(c, r, schedule) {
      var i;

      if(schedule.appliesToForms && schedule.appliesToForms.indexOf(r.form) === -1) {
        return;
      }
      if(schedule.appliesIf && !schedule.appliesIf(c, r)) {
        return;
      }

      if(schedule.appliesToScheduledTaskIf) {
        if(!r.scheduled_tasks) {
          return;
        }
        for (i = 0; i < r.scheduled_tasks.length; i++) {
          if(schedule.appliesToScheduledTaskIf(r, i)) {
            emitForEvents(i);
          }
        }
      } else {
        emitForEvents();
      }

      function emitForEvents(scheduledTaskIdx) {
        var i, dueDate, event, priority, task;
        for (i = 0; i < schedule.events.length; i++) {
          event = schedule.events[i];

          if(event.dueDate) {
            dueDate = event.dueDate(r, event, scheduledTaskIdx);
          } else if(scheduledTaskIdx) {
            dueDate = new Date(Utils.addDate(new Date(r.scheduled_tasks[scheduledTaskIdx].due), event.days));
          } else {
            dueDate = new Date(Utils.addDate(new Date(r.reported_date), event.days));
          }

          if (!Utils.isTimely(dueDate, event)) {
            continue;
          }

          task = {
            // One task instance for each event per form that triggers a task, not per contact
            // Otherwise they collide when contact has multiple reports of the same form
            _id: r._id + '-' + event.id,
            deleted: !!((c.contact && c.contact.deleted) || r.deleted),
            doc: c,
            contact: c.contact,
            icon: schedule.icon,
            date: dueDate,
            title: schedule.title,
            resolved: schedule.resolvedIf(c, r, event, dueDate, scheduledTaskIdx),
            actions: schedule.actions.map(initActions),
          };

          if(scheduledTaskIdx) {
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

    function emitPersonBasedTargetFor(c, targetConfig) {
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
  `);

  lint(jsCode);

  const minifiedJs = minifyJs(jsCode);

  return minifyNools(`
    define Target {
      _id: null,
      deleted: null,
      type: null,
      pass: null,
      date: null
    }

    define Contact {
      contact: null,
      reports: null
    }

    define Task {
      _id: null,
      deleted: null,
      doc: null,
      contact: null,
      icon: null,
      date: null,
      title: null,
      fields: null,
      resolved: null,
      priority: null,
      priorityLabel: null,
      reports: null,
      actions: null
    }

    rule GenerateEvents {
      when {
        c: Contact
      }
      then {
        ${minifiedJs}
      }
    }
  `);
}

function checkForRequiredFilesForDefaultLayout(projectDir) {
  const required = [ 'nools-extras.js', 'targets.js', 'tasks.js' ];

  const missing = required.map(f => `${projectDir}/${f}`)
                          .filter(f => !fs.exists(f));
  if(missing.length) {
    throw new Error(`Missing required file(s): ${missing}`);
  }
}

module.exports = projectDir => {
  const noolsPath = `${projectDir}/rules.nools.js`;
  if(fs.exists(noolsPath)) return minifyNools(templatedJs.fromFile(projectDir, noolsPath));
  else return compileWithDefaultLayout(projectDir);
};
