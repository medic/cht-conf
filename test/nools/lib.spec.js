const assert = require('chai').assert;
const jsToString = require('../../src/lib/js-to-string');
const parseJs = require('../../src/lib/simple-js-parser');

describe('contact-summary lib', function() {
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
      });
      it('should emit once for a person with one report', function() {
      });
      it('should emit once for a person with multiple reports', function() {
      });
    });
    describe('report-based', function() {
    });
  });

  describe('tasks', function() {
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
          c: personWithReports({}),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'task' },
          { _type:'_complete', _id:true },
        ]);
      });

      it('should emit once per report', function() {
        // given
        const config = {
          c: personWithReports({}, {}, {}),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'task' },
          { _type:'task' },
          { _type:'task' },
          { _type:'_complete', _id:true },
        ]);
      });

      it('should emit once per report per task', function() {
        // given
        const config = {
          c: personWithReports({}, {}, {}),
          targets: [],
          tasks: [ aReportBasedTask(), aReportBasedTask() ],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'task' },
          { _type:'task' },
          { _type:'task' },
          { _type:'task' },
          { _type:'task' },
          { _type:'task' },
          { _type:'_complete', _id:true },
        ]);
      });

    });
  });

  function loadLibWith({ c, targets, tasks }) {
    return parseJs({
      jsFiles: [ `${__dirname}/../../src/nools/lib.js` ],
      header: `
          let idx1, idx2, r;
          const c       = ${jsToString(c)};
          const targets = ${jsToString(targets)};
          const tasks   = ${jsToString(tasks)};
          const emitted = [];
          const Utils = {
            addDate: function() {},
            isTimely: function() { return true; },
          };
          class Task {};
          function emit(type, task) {
            task._type = type;
            emitted.push(task);
          };
          `,
      export: [ 'emitted' ],
    });
  }

  function aReportBasedTask() {
    ++idCounter;
    return {
      appliesToType: 'report',
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
});

function personWithoutReports() {
  return personWithReports();
}

function personWithReports(...reports) {
  return { contact:{ type:'person' }, reports };
}
