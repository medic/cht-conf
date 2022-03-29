## [3.10.2](https://github.com/medic/cht-conf/compare/v3.10.1...v3.10.2) (2022-03-29)


### Bug Fixes

* **#371:** allow more characters in form name validation ([265bc48](https://github.com/medic/cht-conf/commit/265bc487d38201e4b3a96ee3d8939c7cba97b5a2)), closes [#371](https://github.com/medic/cht-conf/issues/371) [medic/cht-conf#471](https://github.com/medic/cht-conf/issues/471)

## [3.10.1](https://github.com/medic/cht-conf/compare/v3.10.0...v3.10.1) (2022-02-23)


### Bug Fixes

* **#465:** remove process.exit and extraneous require ([058e651](https://github.com/medic/cht-conf/commit/058e65182928cdefdd5bb8fb41849fb9b5164631)), closes [#465](https://github.com/medic/cht-conf/issues/465)

# [3.10.0](https://github.com/medic/cht-conf/compare/v3.9.5...v3.10.0) (2022-02-02)


### Features

* **#431:** track form version ([9d0b8d7](https://github.com/medic/cht-conf/commit/9d0b8d7df2c04140b9e84cd044d5583695c4e1c0)), closes [#431](https://github.com/medic/cht-conf/issues/431)

## [3.9.5](https://github.com/medic/cht-conf/compare/v3.9.4...v3.9.5) (2022-01-30)


### Bug Fixes

* **#458:** return non-zero code when exiting with failure ([516bff0](https://github.com/medic/cht-conf/commit/516bff0eabec2d3c13a16a994212280d77358c7e)), closes [#458](https://github.com/medic/cht-conf/issues/458)

## [3.9.4](https://github.com/medic/cht-conf/compare/v3.9.3...v3.9.4) (2022-01-05)


### Bug Fixes

* **#460:** log useful error messages when api connection fails ([#461](https://github.com/medic/cht-conf/issues/461)) ([095a55c](https://github.com/medic/cht-conf/commit/095a55c9254c6872696cbee2fe42f244fc1fc4a8)), closes [#460](https://github.com/medic/cht-conf/issues/460) [#460](https://github.com/medic/cht-conf/issues/460)

## [3.9.3](https://github.com/medic/cht-conf/compare/v3.9.2...v3.9.3) (2021-12-16)


### Bug Fixes

* **#455:** allow empty translation constants ([ac170d7](https://github.com/medic/cht-conf/commit/ac170d7cce13a6a500d89884d4ca63801f06a969)), closes [#455](https://github.com/medic/cht-conf/issues/455)

## [3.9.2](https://github.com/medic/cht-conf/compare/v3.9.1...v3.9.2) (2021-12-08)


### Performance Improvements

* **#432:** refactor the moving of reports to use a recursive function to improve performance ([c17b43b](https://github.com/medic/cht-conf/commit/c17b43b4d89b29b813db4be6e0f2d2c0a1e6c94d)), closes [#432](https://github.com/medic/cht-conf/issues/432)

## [3.9.1](https://github.com/medic/cht-conf/compare/v3.9.0...v3.9.1) (2021-11-16)


### Bug Fixes

* **#448:** Bump Ubuntu version and Node version in container to fix docker usage. Updates to readme ([25cb955](https://github.com/medic/cht-conf/commit/25cb955377eea6c6a0a7cb3953d889b57c93884b))

# [3.9.0](https://github.com/medic/cht-conf/compare/v3.8.0...v3.9.0) (2021-11-01)


### Features

* **#413:** fix tags so that next release is 3.9.0 ([6eea489](https://github.com/medic/cht-conf/commit/6eea489804cf0de3c11fe855d2b285e41553439d))
* **#413:** implement continuous delivery ([244203e](https://github.com/medic/cht-conf/commit/244203e341fe46e11dcb7249fd3a77dcb8d1f43c)), closes [#413](https://github.com/medic/cht-conf/issues/413)
* **#413:** provide medic-ci with write permissions to npm ([fd2522e](https://github.com/medic/cht-conf/commit/fd2522ef9c40f697dff2c71a3b638a225cf7adfe)), closes [#413](https://github.com/medic/cht-conf/issues/413)
* **#413:** publish to npm with automation token ([1cf8550](https://github.com/medic/cht-conf/commit/1cf8550cca2d404342e28d0a9086c837fa2a011e)), closes [#413](https://github.com/medic/cht-conf/issues/413)
* **#413:** use GH_ADMIN_TOKEN for release workflow ([0f1c581](https://github.com/medic/cht-conf/commit/0f1c581cc5e0990881ab6a99f6f26a040144bfbc)), closes [#413](https://github.com/medic/cht-conf/issues/413)

## 3.8.0

### Ability to edit a contact type

It is now possible to edit a contact type with the `edit-contacts` action. Additionally, `edit-contacts` accepts a new flag `--updateOfflineDocs`, that allows editing json docs that already exist in the directory provided in `--docDirectoryPath` instead of downloading the docs from the database.

[#408](https://github.com/medic/cht-conf/issues/408)

### Fail early if .eslintrc file is not provided

Running the `compile-app-settings` command now fails early and provides a more descriptive error message to users.

[#333](https://github.com/medic/cht-conf/issues/333)

### Check to make sure CHT instance is up

Commands that require an instance now fail with a more descriptive error message if the instance provided is not reachable

[#380](https://github.com/medic/cht-conf/issues/380)

## 3.7.0

### The repository has been renamed to `cht-conf`. 

Additionally:
- the `medic-conf` cli command is now deprecated, in favor of `cht`.
- the `medic-logs` cli command is now deprecated, in favor of `cht-logs`
- the `pngout-medic` cli command is now deprecated, in favor of `pngout-cht`

### Default "resolvedIf" function for tasks

Task definitions can now omit the `resolvedIf` function. In this case, the task is resolved by any report assigned to the contact that matches the `form` defined in the action of type `report`.
For more information, please check the [documentation](https://docs.communityhealthtoolkit.org/apps/reference/tasks/#default-resolvedif-method).

[#107](https://github.com/medic/cht-conf/issues/107)

## 3.6.0

### Tasks actions `modifyContent` functions now receive the event as a parameter

To support task logic that depends on knowing which event the emission is generated for, `modifyContent` now receives a fourth parameter containing the event data. 
For more information, please check the [documentation](https://docs.communityhealthtoolkit.org/apps/reference/tasks/#tasksjs).

[#398](https://github.com/medic/cht-conf/issues/398)

## 3.5.0

### Forms are validated before being uploaded

When uploading forms to CHT Core v3.11.0 or above these are submitted for validation to ensure they will work when uploaded.

[#331](https://github.com/medic/cht-conf/issues/331)

### Check that the code is up to date with the git repo

Warns when pushing configuration that isn't up to date with the git repo.

[#64](https://github.com/medic/cht-conf/issues/64)

### Bug fixes

- [#358](https://github.com/medic/cht-conf/issues/358): Can't create task action with type "contact"
- [#387](https://github.com/medic/cht-conf/issues/387): Can't upload-app-settings on Node lower than 12

## 3.4.0

### Support for uploading branding and partners docs

Two new actions, `upload-branding` and `upload-partners`, permit uploading branding and partners images, respectively. 
For more information, please check the [documentation](https://docs.communityhealthtoolkit.org/apps/reference/resources/#branding).

[#167](https://github.com/medic/cht-conf/issues/167)

### Modular app_settings and updated folder structure

The `forms` and `schedules` sections of `app_settings` should now be configured individually, in separate files, while other configs should be added to the new `base_settings.json` file. All settings will be compiled into the `app_settings.json`, which should now no longer be edited manually.
For more information, please check the [documentation](https://docs.communityhealthtoolkit.org/apps/reference/app-settings/). 

[#214](https://github.com/medic/cht-conf/issues/214)
[#68](https://github.com/medic/cht-conf/issues/68)

### Improvements

- [#254](https://github.com/medic/cht-conf/issues/254): Add validation to the upload custom translations function
- [#269](https://github.com/medic/cht-conf/issues/269): Warn about deprecated transitions when uploading app-settings

### Bug fixes

- [#345](https://github.com/medic/cht-conf/issues/345): Warn config overwrite falsely alerts about changes when uploading certain types of attachments
- [#164](https://github.com/medic/cht-conf/issues/164): Declarative config appliesToType is indicated as optional for fields and cards but we do require them
- [#377](https://github.com/medic/cht-conf/issues/377): Incorrect warning when specifying hidden_fields
- [#382](https://github.com/medic/cht-conf/issues/382): Contacts with hardcoded types that also have a `contact_type` property don't get the correct contact_summary fields and don't count towards target goals

## 3.3.0

### Support for headless execution

The `--force` argument can now be provided to make it possible to execute commands in a scripted environment by skipping any prompts. This is more dangerous as cht-conf will no longer warn about possible configuration errors, so it's recommended this option is only used when user input is not possible and you have independently verified that the configuration is correct.

[#307](https://github.com/medic/cht-conf/issues/307)

### Privacy policies

Privacy policies can now be uploaded using cht-conf. Read [the documentation](https://docs.communityhealthtoolkit.org/apps/guides/security/privacy-policy/) for more information.

[cht-core#6538](https://github.com/medic/cht-core/issues/6538)

### Bug fixes

- [#332](https://github.com/medic/cht-conf/issues/332): Uploading of multimedia is extremely limited
- [#273](https://github.com/medic/cht-conf/issues/273): Add configurable hierarchy support to doc references in csv-to-docs
- [#322](https://github.com/medic/cht-conf/issues/322): Missing optional appliesIf attribute on contact summary cards causes crash
- [#315](https://github.com/medic/cht-conf/issues/315): Error running csv-to-docs with null properties
- [#325](https://github.com/medic/cht-conf/issues/325): Task generation fails when given contactless reports
- [cht-core#6291](https://github.com/medic/cht-core/issues/6291): Allow specifying subject_key in properties

## 3.2.0

### Prompt before configuration overwrites

This new feature warns and prompts users when uploading a configuration if the configuration being overwritten is not the last known configuration. These warnings are comparable to a database write conflict. Previous versions of cht-conf would upload the new configuration overwriting whatever was there, resulting in users accidentally wiping out someone elses changes or changes made through the App Management webapp.

To detect accidental overwrites, cht-conf will generate two files - `.snapshots/remote.json` and `.snapshots/local.json`. These store the last known configuration on the server. The `remote.json` file should be commited with your configuration changes, and `local.json` should be added to the .gitignore since everyone's local environment is different. If changes are made to the configuration on the server using cht-conf or the App Management webapp without committing the `remote.json` file to your config repo, and then subsequently pulling the changes, then any attempt to upload configuration changes will be notified about the risk and prompted to either overwrite or cancel.

This feature was introduced but not announced in 3.1.0. In this release we have substantially changed the implementation, fixed some bugs, and improved the overall experience.

### Configuration is only uploaded if something has changed

As of this release no docs on the server will be touched unless some configuration has actually changed. This means the end users will not have to download docs with no actual difference giving them a better experience with upgrades.

[#271](https://github.com/medic/cht-conf/issues/271)

### New action to bulk-edit contacts

You can now bulk edit contacts at once by providing a CSV. For more information, read [the documentation](https://github.com/medic/cht-conf/blob/master/README.md#editing-contacts-across-the-hierarchy).

[#297](https://github.com/medic/cht-conf/issues/297)

## 3.1.0

### Declarative Configuration Support for Core Framework v3.8.0

The updates to tasks and targets in Core Framework v3.8.0 require additional data about the tasks and targets emitted by partner rules code. After upgrading to v3.8, the Tasks tab and Targets tab won't function until partner code is updated to send this new data. **Declarative configuration projects must deploy their configuration using cht-conf v3.1 or later for tasks and targets to function on the Core Framework v3.8.0**

It is still safe to deploy declarative configuration to any Core Framework version, including those prior to v3.8.

### Declarative Configuration Tasks/Targets Schema Validation
The updates to tasks and targets in Core Framework v3.8.0 allow for project members to write impact queries against Postgres to understand how tasks are behaving on users' phones. In previous versions of the declarative configuration system, some identification attributes were optional or able to be reused. This becomes problematic after the Core Framework v3.8.0 release because it will lead to data integrity issues if task or target elements are reorderd or removed from within the configuration.

`cht-conf` v3.1 guarantees clearer data integrity with the following changes to the declarative configuration schema:

* Task.name is now a required unique attribute
* Task.event[n].id is now a required unique attribute when there is more than one event
* Target.id although previously required, is now required to be unique

### Declarative Configuration Target "GroupBy"
Two new optional variables `groupBy` and `passesIfGroupCount` in the [declarative Target configuration schema](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#targets) allows for target emissions to be counted and scored in groups. This allows targets to support more complex scenarios like the number of families receiving n household visits/family/month.

## 3.0.5

### Updates to purge configuration

cht-conf has changed the way it compiles purge configuration.
To configure purge, create a file `purge.js` in your project root. This file is a javascript module that should export an object containing your purge configuration:

```
module.exports = {
  text_expression: 'at 12 am on Sunday',
  run_every_days: 7,
  fn: (userCtx, contact, reports, messages) => {
    const old = Date.now() - (1000 * 60 * 60 * 24 * 365);
    return [
        ...reports.filter(report => report.reported_date > old),
        ...messages.filter(message => message.reported_date > old),
    ].map(doc => doc._id);
  },
};
```
Storing the purge function in `purging.js` is deprecated.

## 3.0.0

cht-conf v3.0 contains breaking changes! This release only impacts the `compile-app-settings` action, which impacts the configuration code in `tasks.js`, `targets.js`, `contact-summary.js`, and `contact-summary.templated.js`.

### Breaking Change - Static Analysis via ESLint
cht-conf has changed the engine we use for performing static analysis from [JSHint](https://jshint.com/) to [ESLint](https://eslint.org/). This grants authors more control over the static analysis rules which are enforced on their code. We provide a set of default rules, but you can change or add rules by creating an [.eslintrc file](https://eslint.org/docs/user-guide/configuring#using-configuration-files-1). The default static analysis rules which are enforced in cht-conf 3.0 are similar to the rules which were enforced in cht-conf 2.x, but details may be slightly different.

### Support for ECMAScript 6
In previous versions of cht-conf, configuration JavaScript was been limited to ECMAScript 5. [ECMAScript 6](http://es6-features.org/) is the next generation of the JavaScript language. To use ES6 in your JavaScript configuration code, add a `.eslintrc` file to your project directory with the following contents:

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

If your project is using [CHT Android](https://github.com/medic/cht-android) you must be running a version newer than v0.1.203 (March 2017) to use `ecmaVersion: 6`. ecmaVersions above 6 are not currently supported.

### Breaking Change - Modules
As part of our effort to leverage JavaScript standards, JavaScript configuration code should now use `require('./file')` or `import lib from './file';` to share code between multiple JavaScript files. The global `extras` object is no longer present and you may see the error `'extras' is not defined` when running `compile-app-settings`. This global object was a reference to `nools-extras.js` or `contact-summary-extras.js`, so you can achieve the same behavior by adding the line `var extras = require('./nools-extras');` or `import extras from './nools-extras';` to the top of your JavaScript.  This gives configuration authors the flexibility to have multiple library files, and enables the sharing of code across projects.

You may also find it helpful to leverage third-party modules like [MomentJs](https://momentjs.com/) or [lodash](https://lodash.com/). You may install them using [npm](https://docs.npmjs.com/about-npm/) packages. For example, run `npm install moment` and then add `const moment = require('moment');` in your script. Ensure that you maintain a reasonable file size and memory footprint for your scripts. We support [tree shaking](https://webpack.js.org/guides/tree-shaking/) so use it when possible.

### Breaking Change - contact-summary.js as an ES Module
As part of our effort to leverage JavaScript standards and increase the testability of code, `contact-summary.js` should be a standard ES Module instead of using a bare return. This allows you to write standard unit tests for the file instead of needing a harness or custom wrapper.

`contact-summary.js` in cht-conf 1.x or 2.x:
```
return {
  fields: [],
  cards: [],
  context: {},
};
```

`contact-summary.js` in cht-conf 3.0:
```
module.exports = {
  fields: [],
  cards: [],
  context: {},
};
```

### Breaking Change - Declarative Configuration library is now internal
The [Declarative Configuration System](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md) explicitly provides documented functions which are meant to be re-used in configuration code (eg. [Utils](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#utils)). In cht-conf 2.x and before, it was possible to also re-use some undocumented internals of the declarative library (common examples are `now`, `isReportValid()`, and `emitTargetInstance()`). In cht-conf 3.0, these internals and hidden as was intended. Documented interfaces remain unchanged.

### Breaking Change - Interface change in Target.emitCustom()
The Declarative Configuration [Target Schema](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#target-schema) for `emitCustom` has changed to `function(emit, instance, contact, report)`. The default value is `(emit, instance) => emit(instance)`.

### Debug Mode for compile-app-settings
`cht --local compile-app-settings upload-app-settings -- --debug`

The `--debug` flag will change the behavior of `compile-app-settings` such that:

1. ESLint failures are logged as warnings instead of causing errors
1. Webpack warnings are logged as warnings instead of causing errors
1. Code minification is skipped to make it easier to debug your code

## 2.2.0

cht-conf v2.2 includes:

* New action `move-contact` facilitates the moving of contacts and places within a project's hierarchy. [Documentation](https://github.com/medic/cht-conf#moving-contacts-within-the-hierarchy). [#172](https://github.com/medic/cht-conf/issues/172)
* Updates the `upload-custom-translations` action to support custom locales (for WebApp projects >v3.4.0). [#199](https://github.com/medic/cht-conf/issues/199)
* The declarative configuration [target schema](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#target-schema) has been updated. The idType attribute can now be a function. [#145](https://github.com/medic/cht-conf/issues/145)
* Support for Node 12, refactoring, and code cleanup.

## 2.0.0

cht-conf v2.0 contains breaking interface changes for the command-line and for the [declarative configuration system](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md).

### Breaking Changes to Command-line Arguments
Version 2.0 replaces our custom code for command-line argument parsing with [minimist](https://github.com/substack/minimist). This increases flexibility and more flexible ordering, but includes an interface change for a few commands. Refer to `cht --help` for an overview of all command-line options and syntax.

#### Commands Requiring '='
The command

    cht --url http://admin:pass@localhost:5988

now includes an `=` sign after the `--url`

    cht --url=http://admin:pass@localhost:5988

This affects the `url`, `instance`, `user`, and `shell-completion` arguments.

#### Action List Requires '--' Prefix
The command

    cht --local convert-app-forms upload-app-forms my_form_1 my_form_2

now requires a '--' to separate actions from the list of forms:

    cht --local convert-app-forms upload-app-forms -- my_form_1 my_form_2

### Breaking Changes to Declarative Configuration

 The [declarative configuration system documentation](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md) contains up-to-date documentation of all interfaces.

#### Using Node Modules
We are hoping to converge on the interfaces used for [node modules](https://nodejs.org/api/modules.html) for sharing code between files. Moving forward, Medic configuration files will `export` and `require` code between files. This should 1) simplify the contract between the Medic web app and your configuration code, 2) simplify and facilitate unit testing, 3) allow you to use third-party libraries in your configuration code in future releases, and 4) simplify the cht-conf infrastructure and process for debugging issues.

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
