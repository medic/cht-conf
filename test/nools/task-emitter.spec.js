const chai = require('chai');
const sinon = require('sinon');
const runNoolsLib = require('../run-nools-lib');
const {
  TEST_DATE,
  TEST_DAY,
  reset,
  aReportBasedTask,
  aPersonBasedTask,
  aPlaceBasedTask,
  aScheduledTaskBasedTask,
  aReport,
  aReportWithScheduledTasks,
  personWithoutReports,
  configurableHierarchyPersonWithReports,
  unknownContactWithReports,
  personWithReports,
  placeWithoutReports,
  aHighRiskContact,
  utilsMock,
  highRiskContactDefaults,
  calculatePriorityScore
} = require('./mocks');

const { assert, expect } = chai;
chai.use(require('chai-shallow-deep-equal'));

describe('task-emitter', () => {
  beforeEach(() => reset());

  describe('tasks', () => {
    describe('person-based', () => {

      it('should emit once for a person based task', () => {
        // given
        const config = {
          c: personWithoutReports(),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

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

      it('appliesToType filters by type', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };
        config.tasks[0].appliesToType = ['dne'];

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted).to.have.length(1);
      });

      it('appliesToType is not required', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };
        delete config.tasks[0].appliesToType;

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted[0]).to.nested.include({
          'actions[0].content.source_id': 'c-2',
          resolved: false,
        });
      });

      it('task priority is not required', () => {
        // given
        const contact = personWithReports(aReport());
        const task = aPersonBasedTask();
        const config = {
          c: contact,
          targets: [],
          tasks: [ task ],
        };
        delete config.tasks[0].priority;
        
        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted.filter((e) => e._type === 'task')).to.have.length(1);
        expect(emitted.filter((e) => e._type === 'task')[0]).to.not.have.property('priority');
        expect(emitted.filter((e) => e._type === 'task')[0]).to.not.have.property('prioritLevel');
        expect(emitted.filter((e) => e._type === 'task')[0]).to.be.deep.shallowDeepEqual({
          _type: 'task',
          actions: [{
            content: {
              contact: {
                _id: contact.contact._id,
                reported_date: TEST_DATE,
                type: 'person'
              },
              source: 'task',
              source_id: contact.contact._id
            },
            form: 'example-form',
            label: 'Follow up',
            type: 'report'
          }],
          contact: {
            _id: contact.contact._id,
            reported_date: TEST_DATE,
            type: 'person'
          },
          date: TEST_DAY,
          resolved: false
        });
      });

      it('task priority is string set from object', () => {
        // given
        const report = aReport();
        const contact = personWithReports(report);
        const config = {
          c: contact,
          targets: [],
          tasks: [ aPersonBasedTask() ]
        };
        config.tasks[0].priority = {
          level: 'high',
          label: [{ locale: 'en', label: 'High Priority' }]
        };
        
        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted.filter((e) => e._type === 'task')).to.have.length(1);
        expect(emitted.filter((e) => e._type === 'task')[0]).to.be.deep.equals({
          _id: 'c-2~task~task-3',
          _type: 'task',
          actions: [{
            content: {
              contact: {
                _id: contact.contact._id,
                reported_date: TEST_DATE,
                type: 'person'
              },
              source: 'task',
              source_id: contact.contact._id
            },
            form: 'example-form',
            label: 'Follow up',
            type: 'report'
          }],
          contact: {
            _id: contact.contact._id,
            reported_date: TEST_DATE,
            type: 'person'
          },
          date: TEST_DAY,
          resolved: false,
          priority: 'high',
          priorityLabel: [{ locale: 'en', label: 'High Priority' }]
        });
      });

      it('task priority is string set from callback function', () => {
        // given
        const report = aReport();
        const contact = personWithReports(report);
        const config = {
          c: contact,
          targets: [],
          tasks: [ aReportBasedTask() ],
        };
        config.tasks[0].priority = sinon.stub().returns({
          level: 'high',
          label: [ { locale:'en', label: 'High Priority' } ]
        });
        
        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(config.tasks[0].priority.called).to.be.true;
        expect(config.tasks[0].priority.calledWith(contact, report, config.tasks[0].events[0], TEST_DAY));

        expect(emitted.filter((e) => e._type === 'task')).to.have.length(1);
        expect(emitted.filter((e) => e._type === 'task')[0]).to.be.deep.equals({
          _id: 'r-1~task~task-3',
          date: TEST_DAY,
          actions: [
            {
              type: 'report',
              form: 'example-form',
              label: 'Follow up',
              content: {
                source: 'task',
                source_id: report._id,
                contact: {
                  _id: contact.contact._id,
                  type: 'person',
                  reported_date: TEST_DATE
                }
              }
            }
          ],
          contact: {
            _id: contact.contact._id,
            reported_date: TEST_DATE,
            type: 'person',
          },
          resolved: false,
          priority: 'high',
          priorityLabel: [{ 'locale': 'en', 'label': 'High Priority' }],
          _type: 'task'
        });
      });

      it('task priority is a number score set from callback function', () => {
        // given
        const contact = aHighRiskContact();
        const report  = contact.reports[0];
        
        const task = aReportBasedTask();
        task.priority = (c, r, e, d) => {
          expect(c).to.be.deep.equals(contact);
          expect(r).to.be.deep.equals(report);
          expect(e).to.be.deep.equals(task.events[0]);
          expect(d).to.be.deep.equals(TEST_DAY);

          return calculatePriorityScore(task, c, r, e, d);
        };

        // when
        const { emitted } = runNoolsLib({
          c: contact,
          targets: [],
          tasks: [ task ]
        });

        // then
        expect(emitted.filter((e) => e._type === 'task')).to.have.length(1);
        expect(emitted.filter((e) => e._type === 'task')[0]).to.be.deep.equals({
          _id: 'r-1~task~task-3',
          date: TEST_DAY,
          actions: [
            {
              type: 'report',
              form: 'example-form',
              label: 'Follow up',
              content: {
                source: 'task',
                source_id: report._id,
                contact: {
                  ...highRiskContactDefaults,
                  _id: contact.contact._id,
                  type: 'person',
                  reported_date: TEST_DATE
                }
              }
            }
          ],
          contact: {
            ...highRiskContactDefaults,
            _id: contact.contact._id,
            reported_date: TEST_DATE,
            type: 'person',
          },
          resolved: false,
          priority: 10.0,
          priorityLabel: [{ 'locale': 'en', 'label': 'High Priority' }],
          _type: 'task'
        });
      });
      
      it('appliesToType should filter configurable hierarchy contact', () => {
        // given
        const config = {
          c: configurableHierarchyPersonWithReports(),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'_complete', _id: true },
        ]);
      });

      it('emitted task for configurable hierarchy contact', () => {
        // given
        const config = {
          c: configurableHierarchyPersonWithReports(),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };
        config.tasks[0].appliesToType = 'custom';

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.shallowDeepEqual(emitted, [
          {
            _type: 'task',
            date: TEST_DAY,
            resolved: false,
            actions:[ { form: 'example-form' } ]
          },
          { _type:'_complete', _id: true },
        ]);
      });

      it('should emit multiple tasks for multiple events', () => {
        const task = aReportBasedTask();
        task.events = [
          { id: 'event1', days: 0, start: 0, end: 1 },
          { id: 'event2', days: 1, start: 1, end: 2 },
        ];
        task.priority = (_c, _r, e) => {
          if (e.id === 'event1') {
            return { level: 10 };
          }
          if (e.id === 'event2') {
            return { level: 20 };
          }
          return { level: 0 }; 
        };
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [task],
        };
        const { emitted } = runNoolsLib(config); 
        expect(emitted.filter((e) => e._type === 'task')).to.have.length(2);
        expect(emitted.filter((e) => e._type === 'task')[0]).to.have.property('priority', 10);
        expect(emitted.filter((e) => e._type === 'task')[1]).to.have.property('priority', 20);
        expectAllToHaveUniqueIds(emitted.filter((e) => e._type === 'task'));
      });
      it('should skip emitting if Utils.isTimely returns false', () => {
        const task = aReportBasedTask();
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [task],
          utilsMock: {
            ...utilsMock,
            isTimely: sinon.stub().returns(false),
          },
        };
        const { emitted } = runNoolsLib(config);
        expect(emitted.filter((e) => e._type === 'task')).to.have.length(0);
      });
    });

    describe('place-based', () => {

      it('should emit once for a place based task', () => {
        // given
        const config = {
          c: placeWithoutReports(),
          targets: [],
          tasks: [ aPlaceBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id: true },
        ]);
      });
    });

    describe('report-based', () => {

      it('should not emit if contact has no reports', () => {
        // given
        const config = {
          c: personWithoutReports(),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };
        config.tasks[0].priority = sinon.stub().returns({
          level: 'high',
          label: [ { locale:'en', label: 'High Priority' } ]
        });

        // when
        const { emitted } = runNoolsLib(config);
        
        // then
        expect(config.tasks[0].priority.called).to.be.false;
        assert.deepEqual(emitted, [
          { _type:'_complete', _id: true },
        ]);
      });

      it('should not emit unknown contact', () => {
        // given
        const config = {
          c: unknownContactWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };
        config.tasks[0].appliesToType = 'custom';
        config.tasks[0].priority = sinon.stub().returns({
          level: 'high',
          label: [ { locale:'en', label: 'High Priority' } ]
        });

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        expect(config.tasks[0].priority.called).to.be.false;
        assert.deepEqual(emitted, [
          { _type:'_complete', _id: true },
        ]);
      });

      describe('contactLabel attribute', () => {
        const mockHeading = sinon.stub().returns('foo');
        const scenarios = [
          {
            name: 'as function returning string',
            contactValue: mockHeading,
            expectations: (config, emitted) => {
              expect(emitted[0]).to.nested.include({
                'contact.name': 'foo',
              });
              expect(mockHeading.calledOnce).to.be.true;
              expect(mockHeading.args[0]).to.deep.eq([config.c, config.c.reports[0]]);
            }
          },

          {
            name: 'as string',
            contactValue: 'foo',
            expectations: (config, emitted) => expect(emitted[0]).to.nested.include({ 'contact.name': 'foo' }),
          },

          {
            name: 'undefined',
            contactValue: undefined,
            expectations: (config, emitted) => expect(emitted[0]).to.nested.include({ 'contact.type': 'person' }),
          },
        ];

        for (const scenario of scenarios) {
          it(scenario.name, () => {
            // given
            const config = {
              c: personWithReports(aReport()),
              targets: [],
              tasks: [ aReportBasedTask() ],
            };
            config.tasks[0].contactLabel = scenario.contactValue;

            // when
            const { emitted } = runNoolsLib(config);

            // then
            expect(emitted[0]).to.nested.include({
              _type: 'task',
              'actions[0].content.contact._id': 'c-2',
            });
            scenario.expectations(config, emitted);
          });
        }
      });

      it('should emit once for a single report', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id: true },
        ]);
      });

      it('should use contactLabel if provided as function', () => {
        const task = aReportBasedTask();
        task.contactLabel = sinon.stub().returns('custom label');
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [task],
        };
        const { emitted } = runNoolsLib(config);
        expect(emitted[0].contact).to.deep.equal({ name: 'custom label' });
        expect(task.contactLabel.called).to.be.true;
      });
      it('should use contactLabel if provided as string', () => {
        const task = aReportBasedTask();
        task.contactLabel = 'static label';
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [task],
        };
        const { emitted } = runNoolsLib(config);
        expect(emitted[0].contact).to.deep.equal({ name: 'static label' });
      });
      it('should fallback to c.contact if contactLabel is not provided', () => {
        const task = aReportBasedTask();
        delete task.contactLabel;
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [task],
        };
        const { emitted } = runNoolsLib(config);
        expect(emitted[0].contact).to.have.property('_id');
      });

      it('appliesToType filters by form', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };
        config.tasks[0].appliesToType = ['dne'];

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted).to.have.length(1);
      });

      it('appliesToType is not required', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };
        delete config.tasks[0].appliesToType;

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted[0]).to.nested.include({
          'actions[0].content.source_id': 'r-1',
          resolved: false,
        });
      });

      
      it('should emit once per report', () => {
        // given
        const config = {
          c: personWithReports(aReport(), aReport(), aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id: true },
        ]);

        expectAllToHaveUniqueIds(emitted);
      });

      it('should emit once per report per task', () => {
        // given
        const config = {
          c: personWithReports(aReport(), aReport(), aReport()),
          targets: [],
          tasks: [ aReportBasedTask(), aReportBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id: true },
        ]);

        expectAllToHaveUniqueIds(emitted); // even with undefined name, the resulting ids are unique
      });

      it('emitted events from tasks without name or id should be unique', () => {
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
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted).to.have.property('length', 4);
        expectAllToHaveUniqueIds(emitted);
      });

      it('given contact without reported_date, dueDate defaults to now', () => {
        const clock = sinon.useFakeTimers();

        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };
        delete config.c.contact.reported_date;

        // when
        const { emitted } = runNoolsLib(config);

        // then
        const expected = new Date();
        expected.setHours(0, 0, 0, 0);
        expect(emitted[0].date.getTime()).to.eq(expected.getTime());

        clock.restore();
      });

      it('dueDate function is invoked with expected data', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        const [event] = config.tasks[0].events;
        delete event.days;
        const spy = sinon.spy();
        event.dueDate = spy;

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted).to.have.property('length', 2);
        const [eventArg, c] = spy.args[0];
        expect(eventArg).to.include({ id: 'task' });
        expect(c).to.nested.include({
          'contact._id': 'c-2',
          'reports[0]._id': 'r-1',
        });
      });

      it('should allow custom action content', () => {
        // given
        const task = aReportBasedTask();
        task.actions[0].modifyContent = (content, c, r, e) => {
          content.report_id = r._id;
          content.event = e;
        };
        // and
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ task ],
        };

        // when
        const { emitted } = runNoolsLib(config);

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
                  event: { id: `task`, days: 0, start: 0, end: 1 }
                },
              },
            ]
          },
        ]);
      });

      it('modifyContent for appliesTo contacts', () => {
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
        const { emitted } = runNoolsLib(config);

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

      it('modifyContent gets the correct event', () => {
        const task = {
          appliesTo: 'reports',
          name: `task-1`,
          title: [ { locale:'en', content:`Task 1` } ],
          actions: [ {
            form:'example-form',
            modifyContent: (content, c, r, e) => {
              content.contact_id = c.contact._id;
              content.report_id = r._id;
              content.event = e;
            },
          } ],
          events: [
            { id: `task1`, days:1, start:1, end:2 },
            { id: `task2`, days:1, start:3, end:4 },
            { id: `task3`, days:1, start:5, end:6 },
          ],
          resolvedIf: function() { return false; },
        };

        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ task ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          {
            actions: [
              {
                type: 'report',
                form: 'example-form',
                content: {
                  source: 'task',
                  source_id: 'r-1',
                  contact: { _id: 'c-2' },
                  report_id: 'r-1',
                  event: { id: `task1`, days:1, start:1, end:2 },
                },
              },
            ]
          },
          {
            actions: [
              {
                type: 'report',
                form: 'example-form',
                content: {
                  source: 'task',
                  source_id: 'r-1',
                  contact: { _id: 'c-2' },
                  report_id: 'r-1',
                  event: { id: `task2`, days:1, start:3, end:4 },
                },
              },
            ]
          },
          {
            actions: [
              {
                type: 'report',
                form: 'example-form',
                content: {
                  source: 'task',
                  source_id: 'r-1',
                  contact: { _id: 'c-2' },
                  report_id: 'r-1',
                  event: { id: `task3`, days:1, start:5, end:6 },
                },
              },
            ]
          },
        ]);

      });
    });

    it('functions have access to "this"', () => {
      // given
      const config = {
        c: personWithReports(aReport()),
        targets: [],
        tasks: [ aReportBasedTask() ],
      };

      let invoked = false;
      config.tasks[0].appliesIf = function() {
        expect(this).to.nested.include({
          'definition.appliesTo': 'reports',
          'definition.name': 'task-3',
        });

        invoked = true;
        return false;
      };

      // when
      const { emitted } = runNoolsLib(config);

      // then
      expect(emitted).to.have.property('length', 1);
      expect(invoked).to.be.true;
    });

    it('functions in "this.definition" have access to "this"', () => {
      // given
      const config = {
        c: personWithReports(aReport()),
        targets: [],
        tasks: [ aReportBasedTask() ],
      };

      let invoked = false;
      config.tasks[0].appliesIf = function(isFirst) {
        if (isFirst) {
          return this.definition.appliesIf();
        }

        invoked = true;
        expect(this).to.nested.include({
          'definition.appliesTo': 'reports',
          'definition.name': 'task-3',
        });
        return false;
      };

      // when
      const { emitted } = runNoolsLib(config);

      // then
      expect(emitted).to.have.property('length', 1);
      expect(invoked).to.be.true;
    });

    describe('scheduled-task based', () => {
      it('???', () => { // FIXME this test needs a proper name
        // given
        const config = {
          c: personWithReports(aReportWithScheduledTasks(5)),
          targets: [],
          tasks: [ aScheduledTaskBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id: true },
        ]);
      });
    });

    describe('invalid task type', () => {
      it('should throw error', () => {
        // given
        const invalidTask = aScheduledTaskBasedTask();
        invalidTask.appliesTo = 'unknown';
        const config = {
          c: personWithReports(aReportWithScheduledTasks(5)),
          targets: [],
          tasks: [ invalidTask ],
        };

        // should throw error
        assert.throws(() => { runNoolsLib(config); }, Error, 'Unrecognised task.appliesTo: unknown');
      });
    });

    describe('defaultResolvedIf', () => {
      it('given task definition without resolvedIf, it defaults to defaultResolvedIf', () => {
        const clock = sinon.useFakeTimers();

        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [aPersonBasedTask()],
          utilsMock
        };
        delete config.tasks[0].resolvedIf;

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(utilsMock.isFormSubmittedInWindow.callCount).to.equal(1);
        expect(emitted[0].resolved).to.be.true;

        clock.restore();
      });

      it('this.definition.defaultResolvedIf can be used inside resolvedIf', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [aReportBasedTask()],
          utilsMock
        };

        config.tasks[0].resolvedIf = function (contact, report, event, dueDate) {
          return this.definition.defaultResolvedIf(contact, report, event, dueDate, utilsMock);
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted[0].resolved).to.be.true;
      });
    });

  });
});

const expectAllToHaveUniqueIds = tasks => expect(
  new Set(tasks.map(task => task._id)).size
).to.eq(tasks.length);
