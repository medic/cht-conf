# Release Notes

## 2.0

Medic-conf v2.0.x contains breaking interface changes for the command-line and for the [declarative configuration system](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md).

### Breaking Changes to Command-line Arguments
Version 2.0 replaces our custom code for command-line argument parsing with [minimist](https://github.com/substack/minimist). This increases flexibility and more flexible ordering, but includes an interface change for a few commands.

#### Commands Requiring '='
The command
  
    medic-conf --url http://admin:pass@localhost:5988
  
now includes an `=` sign after the `--url`

    medic-conf --url=http://admin:pass@localhost:5988
    
This affects the `url`, `instance`, `user`, and `shell-completion` arguments. Refer to 

#### Action List Requires '--' Prefix
The command

    medic-conf --local convert-app-forms upload-app-forms my_form_1 my_form_2
    
now requires a '--' to separate actions from the list of forms:

    medic-conf --local convert-app-forms upload-app-forms -- my_form_1 my_form_2

### Breaking Changes to Declarative Configuration

 The [declarative configuration system documentation](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md) contains up-to-date documentation of all interfaces.
 
 #### Using Node Modules
  We are hoping to converge on the interfaces used for [node modules](https://nodejs.org/api/modules.html) for sharing code between files. Moving forward, Medic configuration files will `export` and `require` code between files. This should 1) simplify the contract between the Medic Webapp and your configuration code, 2) simplify and facilitating unit testing, 3) allow you to use third-party libraries in your configuration code in future releases, and 4) simplifying the medic-conf infrastructure and process for debugging issues.
  
  Your `nools-extras.js` file now need to export any values, functions, objects which are to be shared with `tasks.js` or `targets.js` via the `module.exports` interface. [Example](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#nools-extrasjs)
  
  Your `tasks.js` and `targets.js` files should now access the exported attributes in your `nools-extras.js` via the global `extras` object. [Example](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#targetsjs)
  
 #### Re-ordered Parameters
 It can be hard to understand (and hard to document) the parameters which define the interfaces of the declarative configuration system. Version 2.0 includes interface changes which help to keep interfaces more consistent by moving optional variables to the end of the interface. The following interfaces have changed:
 
 Interface | v1.x | v2.x
 -- | -- | --
 tasks.events[n].dueDate | (c/r, event, scheduledTaskIdx) | (event, c, r, scheduledTaskIdx)
 tasks.actions[n].modifyContent | (c/r, content) | (content, c, r)
 targets.emitCustom | (c, r) | (instance, c, r)
 targets.date | ( c ) | (c, r)
  
 #### this
 Sometimes you'll perform a complex seek through a set of reports to determine the result of one function in your declarative configuration. Then you'll find you need the result of that seek when you're determining other behaviors for the task. The `this` keyword is now available in all declarative configuration function interfaces to facilitate basic data sharing. Example:
 
    {
        appliesTo: 'contacts',
        appliesIf: function(contact) {
            const necessaryReport = extras.findNecessaryReport(contact.reports);
            this.necessaryReport = necessaryReport;
            return !!necessaryReport;
        },
        events: [{
            start: 1,
            end: 3,
            dueDate: function (event, contact, report) {
                // Use the saved value of this.necessaryReport
                return this.necessaryReport.reported_date;
            },
        }],
        ...
    }