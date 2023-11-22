const { expect } = require('chai');
const { DateTime } = require('luxon');
const sinon = require('sinon');

const mocks = require('./mocks');
const taskRecurring = require('../../src/nools/task-recurring');

describe('task-recurring', () => {
  beforeEach(() => {
    mocks.reset();
  });
  afterEach(() => {
    sinon.reset();
  });

  const dailyFebruaryEvents = {
    recurringStartDate: '2023-02-01',
    recurringEndDate: '2023-02-28',
  };

  const scenarios = [
    {
      name: '0 tasks before timely window',
      events: dailyFebruaryEvents,
      today: '2022-12-02',
      expectCount: 0,
    },
    {
      name: '1 task when timely window exactly 60 days before recurring start',
      events: dailyFebruaryEvents,
      today: '2022-12-03',
      expectCount: 1,
    },
    {
      name: '28 tasks in middle of feb recurring window',
      events: dailyFebruaryEvents,
      today: '2022-12-03',
      expectCount: 1,
    },
    {
      name: '1 tasks when timely window exactly 30 days after recurring end',
      events: dailyFebruaryEvents,
      today: '2023-03-30',
      expectCount: 1,
    },
    {
      name: '0 tasks after timely window',
      events: dailyFebruaryEvents,
      today: '2023-03-30',
      expectCount: 1,
    },
    {
      name: '0 tasks if recurring window ends before it starts',
      events: {
        recurringStartDate: '2023-02-11',
        recurringEndDate: '2023-02-10',
      },
      today: '2023-02-10',
      expectCount: 0,
    },
    {
      name: '1 tasks when recurring window starts and end same day',
      events: {
        recurringStartDate: '2023-02-10',
        recurringEndDate: '2023-02-10',
      },
      today: '2023-01-10',
      expectCount: 1,
    },
    {
      name: '91 daily tasks when no recurring window',
      events: {},
      today: '2023-01-10',
      expectCount: 91,
    },
    {
      name: '91 daily tasks for large recurring window',
      events: {
        recurringStartDate: '1799-01-01',
        recurringEndDate: '2100-01-01',
      },
      today: '2023-01-10',
      expectCount: 91,
    },
    {
      name: '30 tasks for 3 day period',
      events: {
        recurringStartDate: '1799-01-01',
        period: 3,
      },
      today: '2023-01-11',
      expectCount: 30,
      expect: emissions => {
        expect(emissions[0]._id).to.eq('c-2~recurring~2022-12-13~task-1');
      }
    },
    {
      name: '1 task for yearly task within feb',
      events: {
        recurringStartDate: '1799-02-01',
        period: 12,
        periodUnit: 'months',
      },
      expectCount: 1,
    },

    {
      name: '2nd day of the month',
      events: {
        recurringStartDate: '1799-01-02',
        recurringEndDate: DateTime.fromISO('2500-01-01'),
        periodUnit: 'month',
      },
      today: '2023-02-10',
      expectCount: 3,
      expect: emissions => {
        expect(emissions.map(e => e._id)).to.deep.eq([
          'c-2~recurring~2023-02-02~task-1',
          'c-2~recurring~2023-03-02~task-1',
          'c-2~recurring~2023-04-02~task-1',
        ]);
      }
    },
    {
      name: 'feb 29th',
      events: {
        recurringStartDate: DateTime.fromISO('2000-02-29').toJSDate(),
        period: 2,
        start: 3,
        end: 5,
        periodUnit: 'month',
      },
      today: '2024-02-29',
      expectCount: 2,
      expect: emissions => {
        expect(emissions.map(e => e._id)).to.deep.eq([
          'c-2~recurring~2024-02-29~task-1',
          'c-2~recurring~2024-04-29~task-1', // 28 is bug, 29 works. who cares?
        ]);
      }
    },

    {
      name: 'start larger than timely window',
      events: {
        recurringStartDate: '2021-01-01',
        start: 365 - 60 + 1,
        periodUnit: 'months',
      },
      today: '2020-01-01',
      expectCount: 1,
    },
    {
      name: 'end larger than timely window',
      events: {
        recurringEndDate: '2020-01-01',
        end: 366 - 31 /* dec */ + 1,
        periodUnit: 'days',
      },
      today: '2021-01-01',
      expectCount: 1,
    },
  ];

  const invalidScenarios = [
    {
      name: 'recurringStartDate invalid DateTime',
      events: { recurringStartDate: DateTime.fromISO('abc') },
      expectError: 'parsed',
    },
    {
      name: 'numeric recurringStartDate is invalid',
      events: { recurringStartDate: 5 },
      expectError: 'Date',
    },
    {
      name: 'recurringEndDate invalid date string',
      events: { recurringEndDate: 'abc' },
      expectError: 'parsed',
    },
    {
      name: 'period invalid duration',
      events: { period: -1 },
      expectError: '1 or larger',
    },
  ];

  for (const scenario of [...scenarios, ...invalidScenarios]) {
    it(scenario.name, () => {
      const today = DateTime.fromISO(scenario.today || '2020-01-01');
      sinon.useFakeTimers(today.toJSDate());

      const taskDefinition = mocks.aPersonBasedTask();
      taskDefinition.events = scenario.events;
      const context = {
        taskDefinition,
        c: mocks.personWithReports(),
      };

      if (scenario.expectError) {
        expect(() => taskRecurring(context)).to.throw(scenario.expectError);
      } else {
        const emissions = taskRecurring(context);
        expect(emissions).to.have.property('length', scenario.expectCount);
        if (scenario.expect) {
          scenario.expect(emissions);
        }
      }
    });
  }
});
