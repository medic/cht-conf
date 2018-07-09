const assert = require('chai').assert;
const jsToString = require('../../src/lib/js-to-string');
const parseJs = require('../../src/lib/simple-js-parser');

const TEST_DATE = 1431143098575;

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
          c: personWithReports(aReport()),
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
          c: personWithReports(aReport(), aReport(), aReport()),
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
          c: personWithReports(aReport(), aReport(), aReport()),
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
          let idx1, idx2, r, target;
          const now     = new Date(${TEST_DATE});
          const c       = ${jsToString(c)};
          const targets = ${jsToString(targets)};
          const tasks   = ${jsToString(tasks)};
          const emitted = [];
          const Utils = {
            addDate: function() {},
            isTimely: function() { return true; },
          };
          class Target {};
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

  function aPersonBasedTarget() {
    ++idCounter;
    return {
      id: `pT-${idCounter}`,
      appliesToType: 'person',
    };
  }

  function aReportBasedTarget() {
    ++idCounter;
    return {
      id: `rT-${idCounter}`,
      appliesToType: 'report',
    };
  }

  function aReport() {
    ++idCounter;
    return { _id:`r-${idCounter}`, form:'F' };
  }

  function personWithoutReports() {
    return personWithReports();
  }

  function personWithReports(...reports) {
    ++idCounter;
    return { contact:{ _id:`c-${idCounter}`, type:'person' }, reports };
  }
});
