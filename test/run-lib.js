const path = require('path');
const fs = require('fs');

const srcPath = path.join(__dirname, '..', 'src');
const pathToNoolsLib = path.join(srcPath, 'nools/lib.js');
const pathToContactSummaryLib = path.join(srcPath, 'contact-summary/lib.js');
const noolsLibContent = fs.readFileSync(pathToNoolsLib).toString();
const contactSummaryLibContent = fs.readFileSync(pathToContactSummaryLib).toString();

const evalString = function(str) { return eval(str); }; // jshint ignore:line
const evalInContext = (js, context) => evalString.call(context, ' with(this) { ' + js + ' }');

const { TEST_DATE } = require('./nools/mocks.js');

const runNoolsLib = ({ c, targets, tasks }) => {
  const emitted = [];
  const context = {
    now: new Date(TEST_DATE),
    c, targets, tasks,
    Utils: {
      addDate: function(date, days) {
        const d = new Date(date.getTime());
        d.setDate(d.getDate() + days);
        d.setHours(0, 0, 0, 0);
        return d;
      },
      isTimely: function() { return true; },
    },
    Target: function(props) {
      this._id = props._id;
    },
    Task: function(props) {
      // Any property whose value you want to assert in tests needs to be
      // copied from 'props' to 'this' here.
      this._id = props._id;
      this.date = props.date;
      this.actions = props.actions;
      this.resolved = props.resolved;
    },
    emit(type, taskOrTarget) {
      taskOrTarget._type = type;
      emitted.push(taskOrTarget);
    },
  };

  evalInContext(noolsLibContent, context);
  return { emitted };
};

const runContactSummaryLib = ({ fields, cards }) => {
  const context = {
    fields,
    cards,
  };

  /*
  The lib.js source cannot be evaluated as-is because of the error `Invalid return statement`.
  So wrap it in a closure function, and return the testable outputs of the script
  */
  const libWithinClosure = `(function closure() {
    ${contactSummaryLibContent.replace('return result;', 'return { isReportValid, result };')}
  })()`;
  return evalInContext(libWithinClosure, context);
};

module.exports = {
  runNoolsLib,
  runContactSummaryLib,
};
