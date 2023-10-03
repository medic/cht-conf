const { DateTime, Duration, Interval } = require('luxon');

const DEFAULT_PERIOD = 1;
const DEFAULT_PERIOD_UNIT = 'day';

function getulateRecurringEvents(emitterContext) {
  const { name, events } = emitterContext.taskDefinition;

  const timelyInterval = getTimelyInterval();
  const recurringInterval = getRecurringInterval(events);
  const criteriaInterval = getCriteriaInterval(recurringInterval, timelyInterval, events);
  
  // an invalid interval results if it ends before it starts
  if (!criteriaInterval || !criteriaInterval.isValid) {
    return [];
  }
  
  const periodDuration = getPeriodAsDuration(events);
  const iterationInterval = getIterationInterval(events, recurringInterval, criteriaInterval, periodDuration);
  
  let dueDateIterator = iterationInterval.start;
  const result = [];
  while (dueDateIterator < iterationInterval.end) {
    const taskInterval = getTaskInterval(dueDateIterator, events);
    if (criteriaInterval.overlaps(taskInterval)) {
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

function getRecurringInterval(events) {
  const START_OF_TIME = DateTime.fromISO('1000-01-01');
  const END_OF_TIME = DateTime.fromISO('3000-01-01');
  const start = userInputToDateTime(events.recurringStartDate) || START_OF_TIME;
  const end = userInputToDateTime(events.recurringEndDate) || END_OF_TIME;
  return Interval.fromDateTimes(start.startOf('day'), end.endOf('day'));
}

function getCriteriaInterval(recurringInterval, timelyInterval, events) {
  const expandedTimelyInterval = Interval.fromDateTimes(
    timelyInterval.start.plus({ days: -events.end || 0 }),
    timelyInterval.end.plus({ days: events.start || 0 })
  );
  return recurringInterval.intersection(expandedTimelyInterval);
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

function getIterationInterval(events, recurringInterval, criteriaInterval, period) {
  const advanceDateTimeUsingPeriod = (from, to, roundToFloor = true) => {
    const aggregator = roundToFloor ? Math.floor : Math.ceil;
    const periodUnit = Object.keys(period.toObject())[0];
    const durationToAdvance = to.diff(from, periodUnit);
    const periodsToAdvance = aggregator(durationToAdvance[periodUnit] / period[periodUnit]);
    return from.plus({ [periodUnit]: periodsToAdvance * period[periodUnit] });
  };
  
  // the visibility interval (events.start) must impact the iteration window, but periodic information should be maintained
  const startWithoutPeriod = criteriaInterval.start.plus({ days: -events.start || 0 });
  const endWithoutPeriod = criteriaInterval.end.plus({ days: events.end || 0 });

  return Interval.fromDateTimes(
    advanceDateTimeUsingPeriod(recurringInterval.start, startWithoutPeriod),
    advanceDateTimeUsingPeriod(recurringInterval.end, endWithoutPeriod, false)
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

module.exports = getulateRecurringEvents;
