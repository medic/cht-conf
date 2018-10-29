const assert = require('chai').assert;
const jsToString = require('../../src/lib/js-to-string');
const parseJs = require('../../src/lib/simple-js-parser');

const TEST_DATE = 1431143098575;
// make the tests work in any timezone.  TODO it's not clear if this is a hack,
// or actually correct.  see https://github.com/medic/medic-webapp/issues/4928
const TEST_DAY = new Date(TEST_DATE);
TEST_DAY.setHours(0, 0, 0, 0);

describe('nools lib', function() {
  let idCounter;
  beforeEach(() => idCounter = 0);

  describe('test setup', function() {
    it('should successfully parse the lib', function() {
      // given
      const emptyConfig = { c:{}, targets:[] };

      // when
      const lib = loadLibWith(emptyConfig);

      // then
      assert.isNotNull(lib);
    });

    it('should emit completed signal', function() {
      // given
      const emptyConfig = { c:{}, targets:[] };

      // when
      const emitted = loadLibWith(emptyConfig).emitted;

      // then
      assert.deepEqual(emitted, [ { _type:'_complete', _id:true } ]);
    });
  });

  describe('targets', function() {
    describe('person-based', function() {
      it('should emit once for a person with no reports', function() {
        // given
        const config = {
          c: personWithoutReports(),
          targets: [ aPersonBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
      it('should emit once for a person with one report', function() {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [ aPersonBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
      it('should emit once for a person with multiple reports', function() {
        // given
        const config = {
          c: personWithReports(aReport(), aReport(), aReport()),
          targets: [ aPersonBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
      it('should allow "reported" as target date', function() {
        // given
        const target = aPersonBasedTarget();
        target.date = 'reported';
        // and
        const reportedDate = aRandomTimestamp();
        const contact = personWithoutReports();
        contact.reported_date = reportedDate;
        // and
        const config = {
          c: contact,
          targets: [ target ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'target', date:reportedDate },
          { _type:'_complete', _id:true },
        ]);
      });
      it('should allow "now" as target date', function() {
        // given
        const target = aPersonBasedTarget();
        target.date = 'now';
        // and
        const config = {
          c: personWithoutReports(),
          targets: [ target ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
    });

    describe('place-based', function() {
      it('should emit once for a place with no reports', function() {
        // given
        const config = {
          c: placeWithoutReports(),
          targets: [ aPlaceBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
      it('should emit once for a place with one report', function() {
        // given
        const config = {
          c: placeWithReports(aReport()),
          targets: [ aPlaceBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
      it('should emit once for a place with multiple reports', function() {
        // given
        const config = {
          c: placeWithReports(aReport(), aReport(), aReport()),
          targets: [ aPlaceBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
    });

    describe('report-based', function() {
      describe('with a single target', function() {
        it('should not emit for person with no reports', function() {
          // given
          const config = {
            c: personWithoutReports(aReport()),
            targets: [ aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'_complete', _id:true },
          ]);
        });
        it('should emit once for person with once report', function() {
          // given
          const config = {
            c: personWithReports(aReport()),
            targets: [ aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-2-rT-3' },
            { _type:'_complete', _id:true },
          ]);
        });
        it('should emit once per report for person with multiple reports', function() {
          // given
          const config = {
            c: personWithReports(aReport(), aReport(), aReport()),
            targets: [ aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-4-rT-5' },
            { _type:'target', _id:'c-4-rT-5' },
            { _type:'target', _id:'c-4-rT-5' },
            { _type:'_complete', _id:true },
          ]);
        });
      });

      describe('with multiple targets', function() {
        it('should not emit for person with no reports', function() {
          // given
          const config = {
            c: personWithoutReports(aReport()),
            targets: [ aReportBasedTarget(), aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'_complete', _id:true },
          ]);
        });
        it('should emit once per report for person with one report', function() {
          // given
          const config = {
            c: personWithReports(aReport()),
            targets: [ aReportBasedTarget(), aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-2-rT-3' },
            { _type:'target', _id:'c-2-rT-4' },
            { _type:'_complete', _id:true },
          ]);
        });
        it('should emit once per report for person with multiple reports', function() {
          // given
          const config = {
            c: personWithReports(aReport(), aReport(), aReport()),
            targets: [ aReportBasedTarget(), aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-4-rT-5' },
            { _type:'target', _id:'c-4-rT-5' },
            { _type:'target', _id:'c-4-rT-5' },
            { _type:'target', _id:'c-4-rT-6' },
            { _type:'target', _id:'c-4-rT-6' },
            { _type:'target', _id:'c-4-rT-6' },
            { _type:'_complete', _id:true },
          ]);
        });
      });
    });
    describe('invalid target type', function() {
      it('should throw error', function() {
        // given
        const invalidTarget = aReportBasedTarget();
        invalidTarget.appliesTo = 'unknown';

        const config = {
          c: personWithReports(aReport()),
          targets: [ invalidTarget ],
          tasks: [],
        };

        // throws
        assert.throws(function() { loadLibWith(config); }, Error,
          "Error: unrecognised target type: unknown");
      });
    });
  });

  describe('tasks', function() {
    describe('person-based', function() {

      it('should emit once for a person based task', function() {
        // given
        const config = {
          c: personWithoutReports(),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id:true },
        ]);
      });
    });

    describe('place-based', function() {

      it('should emit once for a place based task', function() {
        // given
        const config = {
          c: placeWithoutReports(),
          targets: [],
          tasks: [ aPlaceBasedTask() ],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id:true },
        ]);
      });
    });

    describe('report-based', function() {

      it('should not emit if contact has no reports', function() {
        // given
        const config = {
          c: personWithoutReports(),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'_complete', _id:true },
        ]);
      });

      it('should emit once for a single report', function() {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id:true },
        ]);
      });

      it('should emit once per report', function() {
        // given
        const config = {
          c: personWithReports(aReport(), aReport(), aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id:true },
        ]);
      });

      it('should emit once per report per task', function() {
        // given
        const config = {
          c: personWithReports(aReport(), aReport(), aReport()),
          targets: [],
          tasks: [ aReportBasedTask(), aReportBasedTask() ],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id:true },
        ]);
      });

    });

    describe('scheduled-task based', function() {
      it('???', function() { // FIXME this test needs a proper name
        // given
        const config = {
          c: personWithReports(aReportWithScheduledTasks(5)),
          targets: [],
          tasks: [ aScheduledTaskBasedTask() ],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id:true },
        ]);
      });
    });

    describe('invalid task type', function() {
      it('should throw error', function() {
        // given
        const invalidTask = aScheduledTaskBasedTask();
        invalidTask.appliesTo = 'unknown';
        const config = {
          c: personWithReports(aReportWithScheduledTasks(5)),
          targets: [],
          tasks: [ invalidTask ],
        };

        // should throw error
        assert.throws(function() { loadLibWith(config); }, Error,
          "Error: unrecognised task type: unknown");
      });
    });

  });

  function loadLibWith({ c, targets, tasks }) {
    return parseJs({
      jsFiles: [ `${__dirname}/../../src/nools/lib.js` ],
      header: `
          let idx1, idx2, r, target;
          const now     = new Date(${TEST_DATE});
          const c       = ${jsToString(c)};
          const targets = ${jsToString(targets)};
          const tasks   = ${jsToString(tasks)};
          const emitted = [];
          const Utils = {
            addDate: function(date, days) {
              const d = new Date(date.getTime());
              d.setDate(d.getDate() + days);
              d.setHours(0, 0, 0, 0);
              return d;
            },
            isTimely: function() { return true; },
          };
          class Target {};
          const Task = function(props) {
            this.date = props.date;
          };
          function emit(type, taskOrTarget) {
            taskOrTarget._type = type;
            emitted.push(taskOrTarget);
          };
          `,
      export: [ 'emitted' ],
    });
  }

  function aReportBasedTask() {
    return aTask('reports');
  }

  function aPersonBasedTask() {
    var task = aTask('contacts');
    task.appliesToType = ['person'];
    return task;
  }

  function aPlaceBasedTask() {
    var task = aTask('contacts');
    task.appliesToType = ['clinic'];
    return task;
  }

  function aTask(type) {
    ++idCounter;
    return {
      appliesTo: type,
      name: `task-${idCounter}`,
      title: [ { locale:'en', content:`Task ${idCounter}` } ],
      actions: [],
      events: [ {
        id: `task-${idCounter}`,
        days:0, start:0, end:1,
      } ],
      resolvedIf: function() { return false; },
    };
  }

  function aScheduledTaskBasedTask() {
    ++idCounter;
    return {
      appliesTo: 'scheduled_tasks',
      name: `task-${idCounter}`,
      title: [ { locale:'en', content:`Task ${idCounter}` } ],
      actions: [],
      events: [ {
        id: `task-${idCounter}`,
        days:0, start:0, end:1,
      } ],
      resolvedIf: function() { return false; },
      appliesIf: function() { return true; },
    };
  }

  function aPersonBasedTarget() {
    ++idCounter;
    return {
      id: `pT-${idCounter}`,
      appliesTo: 'contacts',
      appliesToType: ['person'],
    };
  }

  function aPlaceBasedTarget() {
    ++idCounter;
    return {
      id: `plT-${idCounter}`,
      appliesTo: 'contacts',
      appliesToType: ['clinic'],
    };
  }

  function aReportBasedTarget() {
    ++idCounter;
    return {
      id: `rT-${idCounter}`,
      appliesTo: 'reports',
    };
  }

  function aReport() {
    ++idCounter;
    return { _id:`r-${idCounter}`, form:'F', reported_date:TEST_DATE };
  }

  function aReportWithScheduledTasks(scheduledTaskCount) {
    ++idCounter;

    const scheduled_tasks = [];
    while(scheduledTaskCount--) scheduled_tasks.push({ due:TEST_DATE });

    return { _id:`r-${idCounter}`, form:'F', scheduled_tasks };
  }

  function personWithoutReports() {
    return personWithReports();
  }

  function personWithReports(...reports) {
    ++idCounter;
    return { contact:{ _id:`c-${idCounter}`, type:'person', reported_date:TEST_DATE }, reports };
  }

  function placeWithoutReports() {
    return placeWithReports();
  }

  function placeWithReports(...reports) {
    ++idCounter;
    return { contact:{ _id:`c-${idCounter}`, type:'clinic', reported_date:TEST_DATE }, reports };
  }
});

function aRandomTimestamp() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}
