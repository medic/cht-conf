const assert = require('chai').assert;
const jsToString = require('../../src/lib/js-to-string');
const parseJs = require('../../src/lib/simple-js-parser');

describe('contact-summary lib', function() {
  const loadLibWithConfig = ({ c, targets, tasks }) => {
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
  };

  describe('test setup', function() {
    it('should successfully parse the lib', function() {
      // given
      const lib = loadLibWithConfig({ c:{}, targets:[] });

      // expect
      assert.isNotNull(lib);
    });

    it('should emit completed signal', function() {
      // when
      const emitted = loadLibWithConfig({ c:{}, targets:[] }).emitted;

      // then
      assert.deepEqual(emitted, [ { _type:'_complete', _id:true } ]);
    });
  });

  describe('targets', function() {
    describe('person-based', function() {
    });
    describe('report-based', function() {
    });
  });

  describe('tasks', function() {
    describe('report-based', function() {

      it('should emit once for a single report by default', function() {
        // when
        const emitted = loadLibWithConfig({
          c:{
            contact:{ type:'person' },
            reports: [ {}, ],
          },
          targets: [],
          tasks: [
            {
              name: 'task-1',
              title: [ { locale:'en', content:'Task 1' } ],
              actions: [],
              events: [ {
                id: 'task-1',
                days:0, start:0, end:1,
              } ],
              resolvedIf: function() { return false; },
            },
          ],
        }).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'task' },
          { _type:'_complete', _id:true },
        ]);
      });

      it('should emit once per report by default', function() {
        // when
        const emitted = loadLibWithConfig({
          c:{
            contact:{ type:'person' },
            reports: [ {}, {}, {} ],
          },
          targets: [],
          tasks: [
            {
              name: 'task-1',
              title: [ { locale:'en', content:'Task 1' } ],
              actions: [],
              events: [ {
                id: 'task-1',
                days:0, start:0, end:1,
              } ],
              resolvedIf: function() { return false; },
            },
          ],
        }).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'task' },
          { _type:'task' },
          { _type:'task' },
          { _type:'_complete', _id:true },
        ]);
      });

    });
  });
});
