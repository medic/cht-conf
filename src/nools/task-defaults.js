// File defining task defaults
function taskDefaults(Utils) {
  return {
    defaultResolvedIf: function (contact, report, event, dueDate) {
      var start;
      var end;
      var resolvingForm = getDefaultResolvingForm(this.definition);
      if (!resolvingForm) {
        throw new Error('Could not find the default resolving form!');
      }
      start = 0;
      if (report) {//Report based task
        //Getting the latest date between start of the task's window and just after the report's reported date.
        start = Math.max(Utils.addDate(dueDate, -event.start).getTime(), report.reported_date + 1);
      }
      else {
        start = Utils
        .addDate(dueDate, -event.start)
        .getTime();
      }
      end = Utils
      .addDate(dueDate, event.end + 1)
      .getTime();
      return Utils.isFormSubmittedInWindow(
        contact.reports,
        resolvingForm,
        start,
        end
      );
    }
  };
}

function getDefaultResolvingForm(taskDefinition) {
  var resolvingAction;

  if (!taskDefinition || !taskDefinition.actions) {
    return;
  }

  resolvingAction = taskDefinition.actions.find(
    function (action) {
      return !action.type || action.type === 'report';
    }
  );
  return resolvingAction && resolvingAction.form;
}

module.exports = taskDefaults;