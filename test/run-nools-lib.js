const targetEmitter = require('../src/nools/target-emitter');
const taskEmitter = require('../src/nools/task-emitter');

const { TEST_DATE } = require('./nools/mocks.js');

const runNoolsLib = ({ c, targets, tasks, utilsMock }) => {
  const emitted = [];
  const context = {
    now: new Date(TEST_DATE),
    c,
    targets,
    tasks,
    Utils: () => {
      //TODO: preferred way is to use 'utilsMocks' and this one will be removed when the unit test are aligned with
      // the new approach
      return {
        addDate: function(date, days) {
          const d = new Date(date.getTime());
          d.setDate(d.getDate() + days);
          d.setHours(0, 0, 0, 0);
          return d;
        },
        now: () => new Date(TEST_DATE),
        isTimely: function () { return true; },
      };
    },
    Target: function (props) {
      this._id = props._id;
      this.date = props.date;
      if (props.groupBy) {
        this.groupBy = props.groupBy;
      }
    },
    Task: function (props) {
      // Any property whose value you want to assert in tests needs to be
      // copied from 'props' to 'this' here.
      this._id = props._id;
      this.date = props.date;
      this.actions = props.actions;
      this.contact = props.contact;
      this.resolved = props.resolved;
    },
    emit(type, taskOrTarget) {
      taskOrTarget._type = type;
      emitted.push(taskOrTarget);
    },
  };

  //context.Utils is deprecated, please use utilsMock in unit tests
  targetEmitter(context.targets, context.c, utilsMock || context.Utils(), context.Target, context.emit);
  // context.Utils is deprecated, please use utilsMock in unit tests
  taskEmitter(context.tasks, context.c, utilsMock || context.Utils(), context.Task, context.emit);
  context.emit('_complete', { _id: true });

  return { emitted };
};

module.exports = runNoolsLib;
