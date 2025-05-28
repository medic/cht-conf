const sinon = require('sinon');

let idCounter;
const TEST_DATE = 1431143098575;
// make the tests work in any timezone.  TODO it's not clear if this is a hack,
// or actually correct.  see https://github.com/medic/cht-core/issues/4928
const TEST_DAY = new Date(TEST_DATE);
TEST_DAY.setHours(0, 0, 0, 0);

const utilsMock = {
  now: sinon.stub().returns(new Date(TEST_DATE)),
  isTimely: sinon.stub().returns(true),
  isFormSubmittedInWindow: sinon.stub().returns(true),
  addDate: (date, days) => {
    const newDate = new Date(date.getTime());
    newDate.setDate(newDate.getDate() + days);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }
};

const calculatePriorityScore = (t, c, r, e, d) => {
  const _20_YEARS_AGO = utilsMock.addDate(TEST_DAY, -(20 * 365));
  const taskWeightFactorScore = () => 10;
  const individualRiskFactor = (c) => {
    let factor = 0;
    if (c.contact.t_danger_signs_referral_follow_up === 'yes') {
      factor += 2;
    }
    if (c.contact.sex === 'female' && c.contact.date_of_birth >= _20_YEARS_AGO) {
      factor += 2;
    }
    if (c.contact.danger_signs.is_multiparous === 'yes') {
      factor += 1;
    }
    if (c.contact.danger_signs.known_chronic_condition === 'yes') {
      factor += 3;
    }
    if (c.contact.danger_signs.child_is_disabled === 'yes') {
      factor += 2;
    }
    return factor;
  };

  let score = 0;
  let label;

  score += taskWeightFactorScore(t);
  score += individualRiskFactor(c, r, e, d);

  //normalize: out of 10, possible total: 20
  score = parseFloat((((score / 20.0) * 10).toFixed(2)));

  if (score >= 8 && score <= 10) {
    label = 'High Priority';
  } 
  else if (score >= 5 && score < 8) {
    label = 'Medium Priority';
  }
  else if (score > 0 && score < 5) {
    label = 'Low Priority';
  }
  
  return { level: score, label: [ { locale:'en', label: (label || '') } ] };
};

const highRiskContactDefaults = {
  name: 'New Underage Mother',
  sex: 'female',
  date_of_birth: utilsMock.addDate(utilsMock.now(), -(19 * 365)),
  vaccines_received: 'bcg_and_birth_polio',
  t_danger_signs_referral_follow_up: 'yes',
  t_danger_signs_referral_follow_up_date: utilsMock.addDate(utilsMock.now(), 2),
  measurements: {
    weight: '2500',
    length: '39'
  },
  danger_signs: {
    convulsion: 'no',
    difficulty_feeding: 'yes',
    vomit: 'yes',
    drowsy: 'no',
    stiff: 'no',
    yellow_skin: 'no',
    fever: 'no',
    blue_skin: 'no',
    child_is_disabled: 'yes',
    known_chronic_condition: 'yes',
    is_multiparous: 'yes'
  },
  created_by_doc: 'fake_delivery_report_uuid'
};

function aReportBasedTask() {
  return aTask('reports');
}

function aPersonBasedTask() {
  const task = aTask('contacts');
  task.appliesToType = ['person'];
  return task;
}

function aPlaceBasedTask() {
  const task = aTask('contacts');
  task.appliesToType = ['clinic'];
  return task;
}

function aHighRiskContact() {  
  const person = personWithReports(aReport());

  return {
    ...person,
    contact: {
      ...person.contact,
      ...highRiskContactDefaults
    }
  };
}

function aTask(type) {
  ++idCounter;
  return {
    appliesTo: type,
    name: `task-${idCounter}`,
    title: [ { locale:'en', content:`Task ${idCounter}` } ],
    actions: [{ form: 'example-form' }],
    events: [ {
      id: `task`,
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
  while(scheduledTaskCount--) {
    scheduled_tasks.push({ due:TEST_DATE });
  }

  return { _id:`r-${idCounter}`, form:'F', scheduled_tasks };
}

function personWithoutReports() {
  return personWithReports();
}

function personWithReports(...reports) {
  ++idCounter;
  return { contact:{ _id:`c-${idCounter}`, type:'person', reported_date:TEST_DATE }, reports };
}

function configurableHierarchyPersonWithReports(...reports) {
  ++idCounter;
  return { contact: { _id:`c-${idCounter}`, type:`contact`, contact_type:`custom`, reported_date:TEST_DATE }, reports };
}

function placeWithoutReports() {
  return placeWithReports();
}

function placeWithReports(...reports) {
  ++idCounter;
  return { contact:{ _id:`c-${idCounter}`, type:'clinic', reported_date:TEST_DATE }, reports };
}

function unknownContactWithReports(...reports) {
  return { reports };
}

function aRandomTimestamp() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

module.exports = {
  reset: () => { idCounter = 0; },
  TEST_DATE,
  TEST_DAY,
  aReportBasedTask,
  aPersonBasedTask,
  aPlaceBasedTask,
  aTask,
  aScheduledTaskBasedTask,
  aPersonBasedTarget,
  aPlaceBasedTarget,
  aReportBasedTarget,
  aReport,
  aReportWithScheduledTasks,
  personWithoutReports,
  configurableHierarchyPersonWithReports,
  personWithReports,
  placeWithoutReports,
  placeWithReports,
  unknownContactWithReports,
  aRandomTimestamp,
  aHighRiskContact,
  highRiskContactDefaults,
  utilsMock,
  calculatePriorityScore
};
