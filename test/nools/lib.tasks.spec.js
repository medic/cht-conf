const chai = require('chai');
const { expect, assert } = chai;
chai.use(require('chai-shallow-deep-equal'));

const { runNoolsLib } = require('../run-lib');
const {
  TEST_DAY,
  reset,
  aReportBasedTask,
  aPersonBasedTask,
  aPlaceBasedTask,
  aScheduledTaskBasedTask,
  aReport,
  aReportWithScheduledTasks,
  personWithoutReports,
  personWithReports,
  placeWithoutReports,
} = require('./mocks');

describe('nools lib', function() {
  beforeEach(() => reset());

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
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.shallowDeepEqual(emitted, [
          {
            _type: 'task',
            date: TEST_DAY,
            resolved: false,
            actions:[ { form:'example-form' } ]
          },
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
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.shallowDeepEqual(emitted, [
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
        const emitted = runNoolsLib(config).emitted;

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
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.shallowDeepEqual(emitted, [
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
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id:true },
        ]);

        expectAllToHaveUniqueIds(emitted);
      });

      it('should emit once per report per task', function() {
        // given
        const config = {
          c: personWithReports(aReport(), aReport(), aReport()),
          targets: [],
          tasks: [ aReportBasedTask(), aReportBasedTask() ],
        };

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id:true },
        ]);

        expectAllToHaveUniqueIds(emitted); // even with undefined name, the resulting ids are unique
      });

      it('emitted events from tasks without name or id should be unique', function() {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask(), aReportBasedTask() ],
        };

        config.tasks.forEach(task => delete task.name);

        const [event] = config.tasks[0].events;
        delete event.id;
        config.tasks[0].events = [event, event];

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        expect(emitted).to.have.property('length', 4);
        expectAllToHaveUniqueIds(emitted);
      });

      it('dueDate function is invoked with expected data', function() {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        const [event] = config.tasks[0].events;
        delete event.days;
        event.dueDate = (event, c, r) => {
          emit('invoked', { event, c, r }); // jshint ignore:line
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        expect(emitted).to.have.property('length', 3);
        const [invoked] = emitted;
        expect(invoked).to.nested.include({
          'event.id': 'task',
          'c.contact._id': 'c-2',
          'c.reports[0]._id': 'r-1',
        });
      });

      it('should allow custom action content', function() {
        // given
        const task = aReportBasedTask();
        task.actions[0].modifyContent =
            (content, c, r) => { content.report_id = r._id; };
        // and
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ task ],
        };

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.shallowDeepEqual(emitted, [
          {
            actions:[
              {
                type: 'report',
                form: 'example-form',
                label: 'Follow up',
                content: {
                  source: 'task',
                  source_id: 'r-2',
                  contact: {
                    _id: 'c-3',
                  },
                  report_id: 'r-2',
                },
              },
            ]
          },
        ]);
      });

      it('modifyContent for appliesTo contacts', function() {
        // given
        const task = aPersonBasedTask();
        task.actions[0].modifyContent = (content, c) => { content.report_id = c.contact._id; };
        // and
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ task ],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.shallowDeepEqual(emitted, [
          {
            actions:[
              {
                type: 'report',
                form: 'example-form',
                label: 'Follow up',
                content: {
                  source: 'task',
                  source_id: 'c-3',
                  contact: {
                    _id: 'c-3',
                  },
                  report_id: 'c-3',
                },
              },
            ]
          },
        ]);
      });

    });

    it('functions have access to "this"', function() {
      // given
      const config = {
        c: personWithReports(aReport()),
        targets: [],
        tasks: [ aReportBasedTask() ],
      };

      config.tasks[0].appliesIf = function() {
        emit('invoked', { _this: this }); // jshint ignore:line
        return false;
      };

      // when
      const emitted = loadLibWith(config).emitted;

      // then
      expect(emitted).to.have.property('length', 2);
      expect(emitted[0]).to.nested.include({
        '_this.definition.appliesTo': 'reports',
        '_this.definition.name': 'task-3',
      });
    });

    it('functions in "this.definition" have access to "this"', function() {
      // given
      const config = {
        c: personWithReports(aReport()),
        targets: [],
        tasks: [ aReportBasedTask() ],
      };

      config.tasks[0].appliesIf = function(isFirst) {
        if (isFirst) {
          return this.definition.appliesIf();
        }

        emit('invoked', { _this: this }); // jshint ignore:line
        return false;
      };

      // when
      const emitted = loadLibWith(config).emitted;

      // then
      expect(emitted).to.have.property('length', 2);
      expect(emitted[0]).to.nested.include({
        '_this.definition.appliesTo': 'reports',
        '_this.definition.name': 'task-3',
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
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.shallowDeepEqual(emitted, [
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
        assert.throws(function() { runNoolsLib(config); }, Error, "unrecognised task type: unknown");
      });
    });

  });
});

const expectAllToHaveUniqueIds = tasks => expect(
  new Set(tasks.map(task => task._id)).size
).to.eq(tasks.length);
