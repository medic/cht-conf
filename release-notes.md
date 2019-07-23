# Release Notes

## 3.0

medic-conf v3.0 contains breaking changes! This release only impacts the `compile-app-settings` action and the partner code written in `tasks.js`, `targets.js`, `contact-summary.js`, and `contact-summary.templated.js`.

### Breaking Change - Static Analysis via EsLint
medic-conf has changed the engine we use for performing static analysis from [JsHint](https://jshint.com/) to [eslint](https://eslint.org/). This grants authors more control over the static analysis rules which are enforced on their code. We provide a set of default rules, but you can create an [.eslintrc file](https://eslint.org/docs/user-guide/configuring#using-configuration-files-1) to define your override these defaults or define your own static analysis rules. The default static analysis rules which are enforced in medic-conf 3.0 are similar to the rules which were enforced in medic-conf 2.x, but details may be slightly different.

### Support for ECMAScript 6
In previous versions of medic-conf, configuration Javascript was been limited to ES5. [ECMAScript 6](http://es6-features.org/) was a huge change for the JavaScript language and community. To use ES6 in your JavaScript configuration code, add a `.eslintrc` file to your project directory with the following contents:

```
{
  "env": {
    "node": true,
    "es6": true
  },
  "parserOptions": {
    "ecmaVersion": 6
  }
}
```

If your project is using [medic-android](https://github.com/medic/medic-android) you must be running >v0.1.203 (March 2017) to use `ecmaVersion: 6`. The `medic-android` project does not support ecmaVersions above 6.

### Breaking Change - Modules
As part of our effort to leverage JavaScript standards, JavaScript configuration code should now use `require('./file')` or `import lib from './file';` to share code between multiple JavaScript files. The global `extras` object is no longer present and you may see the error `'extras' is not defined` when running `compile-app-settings`. This global object was a reference to `nools-extras.js` or `contact-summary-extras.js`, so you can achieve the same behavior by adding the line `var extras = require('./nools-extras');` or `import extras from './nools-extras';` to the top of your JavaScript.  This gives configuration authors the flexibility to have multiple library files, and enables the sharing of code across projects.

You may also find it helpful to leverage third-party modules like [MomentJs](https://momentjs.com/) or [lodash](https://lodash.com/). You may install them using [npm](https://docs.npmjs.com/about-npm/) packages. For example, run `npm install moment` and then add `const moment = require('moment');` in your script. Ensure that you maintain a reasonable file size and memory footprint for your scripts. We support [tree shaking](https://webpack.js.org/guides/tree-shaking/) so use it when possible.

### Breaking Change - contact-summary.js as an ES Module
As part of our effort to leverage JavaScript standards and increase the testability of code, `contact-summary.js` should be a standard ES Module instead of using a bare return. This allows you to write standard unit tests for the file instead of needing a harness or custom wrapper.

`contact-summary.js` in medic-conf 1.x or 2.x:
```
return {
  fields: [],
  cards: [],
  context: {},
};
```

`contact-summary.js` in medic-conf 3.0:
```
module.exports = {
  fields: [],
  cards: [],
  context: {},
};
```

### Breaking Change - Declarative Configuration library is now internal
The [Declarative Configuration System](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md) explicitly provides documented functions which are meant to be re-used by configuration code (eg. [Utils](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#utils)). It was also possible for configuration code to use the undocumented internals of the declarative library (commonly used examples are `now`, `isReportValid()`, and `emitTargetInstance()`). In medic-conf 3.0, all internal functions and variables are no longer accessible. Documented interfaces remain unchanged.

### Breaking Change - Interface change in Target.emitCustom()
The Declarative Configuration [Target Schema](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#target-schema) for `emitCustom` has changed to `function(emit, instance, contact, report)`. The default value is `(emit, instance) => emit(instance)`.

### Debug Mode for compile-app-settings
`medic-conf --local compile-app-settings upload-app-settings -- --debug`

The `--debug` flag will change the behavior of `compile-app-settings` such that:

1. Eslint failures are logged as warnings instead of causing errors
1. Webpack warnings are logged as warnings instaed of causing errors
1. Code minification is skipped to make it easier to debug your code

## 2.2

Medic-conf v2.2 includes:

* New action `move-contact` facilitates the moving of contacts and places within a project's hierarchy. [Documentation](https://github.com/medic/medic-conf#moving-contacts-within-the-hierarchy). [#172](https://github.com/medic/medic-conf/issues/172)
* Updates the `upload-custom-translations` action to support custom locales (for WebApp projects >v3.4.0). [#199](https://github.com/medic/medic-conf/issues/199)
* The declarative configuration [target schema](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#target-schema) has been updated. The idType attribute can now be a function. [#145](https://github.com/medic/medic-conf/issues/145)
* Support for Node 12, refactoring, and code cleanup.

## 2.0

Medic-conf v2.0 contains breaking interface changes for the command-line and for the [declarative configuration system](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md).

### Breaking Changes to Command-line Arguments
Version 2.0 replaces our custom code for command-line argument parsing with [minimist](https://github.com/substack/minimist). This increases flexibility and more flexible ordering, but includes an interface change for a few commands. Refer to `medic-conf --help` for an overview of all command-line options and syntax.

#### Commands Requiring '='
The command
  
    medic-conf --url http://admin:pass@localhost:5988
  
now includes an `=` sign after the `--url`

    medic-conf --url=http://admin:pass@localhost:5988
    
This affects the `url`, `instance`, `user`, and `shell-completion` arguments.

#### Action List Requires '--' Prefix
The command

    medic-conf --local convert-app-forms upload-app-forms my_form_1 my_form_2
    
now requires a '--' to separate actions from the list of forms:

    medic-conf --local convert-app-forms upload-app-forms -- my_form_1 my_form_2

### Breaking Changes to Declarative Configuration

 The [declarative configuration system documentation](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md) contains up-to-date documentation of all interfaces.
 
#### Using Node Modules
We are hoping to converge on the interfaces used for [node modules](https://nodejs.org/api/modules.html) for sharing code between files. Moving forward, Medic configuration files will `export` and `require` code between files. This should 1) simplify the contract between the Medic web app and your configuration code, 2) simplify and facilitate unit testing, 3) allow you to use third-party libraries in your configuration code in future releases, and 4) simplify the medic-conf infrastructure and process for debugging issues.
  
Your `nools-extras.js` file now need to export any values, functions, objects which are to be shared with `tasks.js` or `targets.js` via the `module.exports` interface. [Example](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#nools-extrasjs)
  
Your `tasks.js` and `targets.js` files should now access the exported attributes in your `nools-extras.js` via the global `extras` object. [Example](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#targetsjs)
  
#### Re-ordered Parameters
It can be hard to understand (and hard to document) the parameters which define the interfaces of the declarative configuration system. Version 2.0 includes interface changes which help to keep interfaces more consistent by moving optional variables to the end of the interface. The following interfaces have changed:
 
Interface | v1.x | v2.x
-- | -- | --
tasks.events[n].dueDate | (contact/reports, event, scheduledTaskIdx) | (event, contact, reports, scheduledTaskIdx)
tasks.actions[n].modifyContent | (contact/reports, content) | (content, contact, reports)
targets.emitCustom | (contact, reports) | (instance, contact, reports)
targets.date | ( contact ) | (contact, reports)

### New Features in Declarative Configuration

#### this
The `this` keyword is now available in all declarative configuration function interfaces to facilitate basic data sharing. This allows you to re-use a variable in another part of the task or target, rather than re-calculating it's value again. 

For example, you may have a complex seek through a set of reports in your `appliesIf` function, and need the same seek in calculating the `dueDate`, as seen in the example below.
 
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
