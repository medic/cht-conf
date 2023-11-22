const { DateTime, Duration, Interval } = require('luxon');

const DEFAULT_PERIOD = 1;
const DEFAULT_PERIOD_UNIT = 'day';

/*
Interval Definitions:

Timely - Interval in which task emissions are used (defined by cht-core)
Scheduled - Interval in which the user specified the task to recur
Task - Interval in which a task would be visible to the user if emitted
Emission - An emission is made if the task interval overlaps this interval
Iteration - Inverval over which task intervals are evaluated
*/

function getRecurringEvents(emitterContext) {
  const { name, events } = emitterContext.taskDefinition;

  const timelyInterval = getTimelyInterval();
  const scheduledInterval = getScheduledInterval(events);
  const emissionInterval = getEmissionInterval(scheduledInterval, timelyInterval, events);
  
  // an invalid interval results if it ends before it starts
  if (!emissionInterval || !emissionInterval.isValid) {
    return [];
  }
  
  const periodDuration = getPeriodAsDuration(events);
  const iterationInterval = getIterationInterval(events, scheduledInterval, emissionInterval, periodDuration);
  
  let dueDateIterator = iterationInterval.start;
  const result = [];
  while (dueDateIterator < iterationInterval.end) {
    const taskInterval = getTaskInterval(dueDateIterator, events);
    if (emissionInterval.overlaps(taskInterval)) {
      const uuidPrefix = emitterContext.r ? emitterContext.r._id : emitterContext.c.contact && emitterContext.c.contact._id;
      result.push({
        _id: `${uuidPrefix}~recurring~${dueDateIterator.toISODate()}~${name}`,
        date: dueDateIterator.toMillis(),
        event: events,
      });
    }

    dueDateIterator = dueDateIterator.plus(periodDuration);
  }

  return result;
}

function getTimelyInterval() {
  // "Timely" is terminology used by the tasks engine for the time interval within task emissions will get converted into task documents
  // https://github.com/medic/cht-core/blob/master/shared-libs/rules-engine/src/task-states.js#L20
  return Interval.fromDateTimes(
    DateTime.now().startOf('day').plus({ days: -30 }),
    DateTime.now().endOf('day').plus({ days: 60 })
  );
}

function getScheduledInterval(events) {
  const START_OF_TIME = DateTime.fromISO('1000-01-01');
  const END_OF_TIME = DateTime.fromISO('3000-01-01');
  const start = userInputToDateTime(events.recurringStartDate) || START_OF_TIME;
  const end = userInputToDateTime(events.recurringEndDate) || END_OF_TIME;
  return Interval.fromDateTimes(start.startOf('day'), end.endOf('day'));
}

function getEmissionInterval(scheduledInterval, timelyInterval, events) {
  const expandedTimelyInterval = Interval.fromDateTimes(
    timelyInterval.start.plus({ days: -events.end || 0 }),
    timelyInterval.end.plus({ days: events.start || 0 })
  );
  return scheduledInterval.intersection(expandedTimelyInterval);
}

function getPeriodAsDuration(events) {
  const measure = events.period || DEFAULT_PERIOD;
  const unit = events.periodUnit || DEFAULT_PERIOD_UNIT;
  
  // enforced by joi: allowed units and measure > 1
  if (measure < 1) {
    // this causes really bad things, so just in case this is a duplicate assertion
    throw new Error(`Invalid event parameter "period": Values must be 1 or larger`);
  }
  
  const periodDuration = Duration.fromObject({ [unit]: measure });
  if (!periodDuration.isValid) {
    throw Error(`Invalid event parameter "period": ${periodDuration.invalidExplanation}`);
  }

  const periodInDays = periodDuration.shiftTo('days').days;
  if (periodInDays > 1 && !events.recurringStartDate) {
    throw Error('Event parameter "recurringStartDate" is required when period is longer than 1 day');
  }

  return periodDuration;
}

function getIterationInterval(events, scheduledInterval, emissionInterval, period) {
  const advanceDateTimeUsingPeriod = (from, to, roundToFloor = true) => {
    const aggregator = roundToFloor ? Math.floor : Math.ceil;
    const periodUnit = Object.keys(period.toObject())[0];
    const durationToAdvance = to.diff(from, periodUnit);
    const periodsToAdvance = aggregator(durationToAdvance[periodUnit] / period[periodUnit]);
    return from.plus({ [periodUnit]: periodsToAdvance * period[periodUnit] });
  };
  
  // the visibility interval (events.start) must impact the iteration window, but periodic information should be maintained
  const startWithoutPeriod = emissionInterval.start.plus({ days: -events.start || 0 });
  const endWithoutPeriod = emissionInterval.end.plus({ days: events.end || 0 });

  return Interval.fromDateTimes(
    advanceDateTimeUsingPeriod(scheduledInterval.start, startWithoutPeriod),
    advanceDateTimeUsingPeriod(scheduledInterval.end, endWithoutPeriod, false)
  );
}

function getTaskInterval(dueDate, events) {
  const start = dueDate.plus({ days: -events.start || 0 }).startOf('day');
  const end = dueDate.plus({ days: events.end || 0 }).endOf('day');
  return Interval.fromDateTimes(start, end);
}

function userInputToDateTime(input) {
  if (!input) {
    return;
  }

  let result;
  if (DateTime.isDateTime(input)) {
    result = input;
  } else if (typeof input === 'object') {
    result = DateTime.fromJSDate(input);
  } else if (typeof input === 'string') {
    result = DateTime.fromISO(input, { locale: 'en-US' });
  } else {
    throw Error('Invalid event parameter: Expected type is Date(), Luxon DateTime(), or ISO string');
  }

  if (!result.isValid) {
    throw Error(`Invalid event parameter: ${result.invalidExplanation}`);
  }

  return result;
}

module.exports = getRecurringEvents;
