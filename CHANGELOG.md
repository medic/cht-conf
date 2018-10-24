# Changelog

## v1.18.8
* [compile-app-settings] reject double nools definitions
* Fix test result ordering
* Break release if tests are excluded accidentally

## v1.18.7
* Change target.icon field to recommended instead of required

## v1.18.6
* Update node requirement in README

## v1.18.5
* Add explicit dependency on request

## v1.18.4
* Support due date for contact-based tasks
* Add FIXME for unnamed test

## v1.18.3
* Check for uncommitted files before releasing

## v1.18.2
* [fetch-forms-from-google-drive] update for new googleapis

## v1.18.1
* Update googleapis require statements
* Update package-lock.json

## v1.18.0
* Bump dependency versions to latest

## v1.17.14
* Update to pouchdb version 7.0.0

## v1.17.13
* Correctly split translations containing equals signs

## v1.17.12
* Output error line number and column from minifyjs

## v1.17.11
* Fix --version flag

## v1.17.10
* Bump pyxform-medic version to latest
* Change switch statement formatting
* Updates package to AGPL license
* Creates AGPL license file

## v1.17.9
* Releasing 1.17.9
* Add support for contacts and reports for all nools workflows (#81)
* Replaces the CouchDB port with default API port
* Replaces the CouchDB port with default API port
* Add tests for scheduled_tasks-based nools task generation
* Fix test name for nools lib

## v1.17.8
* Bump version number for re-release

## v1.17.7
* Add simple tests for contact-summary & nools lib code
* Fix comment ref NO_LABEL

## v1.17.6
* [compile-contact-summary] separate templated source into proper .js file
* Fix unit tests for compile-contact-summary

## v1.17.5
* Move bundled nools code to a proper .js file

## v1.17.4
* Don't confuse jshint by talking about jshint
* Fix: first scheduled_task date is incorrect

## v1.17.3
* [compile-app-settings] allow console.log() statements

## v1.17.2
* [jshint] detect redeclarations in global scope
* [compile-nools-rules] Remove duplicate definition of createTargetInstance

## v1.17.1
* Check COUCH_URL env var is local

## v1.17.0
* [compile-app-settings] check conf version matches that of project
* Move binary source files into src/

## v1.16.19
* [compile-nools-rules] pass scheduledTaskIdx to emitTasksForSchedule()

## v1.16.18
* Add documentation about releasing

## v1.16.17
* [jshint] don't let config changes leak

## v1.16.16
* [compile-app-settings] use default jshint settings

## v1.16.15
* [compile-contact-summary] fix test
* [compile-app-settings] share jshint reporting code

## v1.16.14
* [contact-summary] allow structured card.fields
* Fix __include_inline__() input trimming

## v1.16.13
* Update ordering and content of README
* Remove items from README which have been done

## v1.16.12
* [compile-contact-summary] introduce standardised layout
* Fix indentation
* [minify-js] print warnings better

## v1.16.11
* [compile-app-settings] Add missing source file

## v1.16.10
* [compile-app-settings] Uglify app-settings JS

## v1.16.9
* Allow structured tasks & targets config

## v1.16.8
* Update dependencies

## v1.16.7
* Update changelog for release
* Add option to specify username with --instance CLI switch

## v1.16.6
* Add CHANGELOG entries pre v1.6
* Add --changelog flag to usage output

## v1.16.5
* Add support for changelog

## v1.16.4
* Bump dependencies

## v1.16.3
* [upload-sms-from-csv] add support for sent_timestamp

## v1.16.2
* Add support for missing tasks.json file

## v1.16.1
* Separate JS templating into separate module

## v1.16.0
* Allow templating of contact-summary.js

## v1.15.0
* Update nools templating to use __include_inline__()

## v1.14.2
* Update pouchdb and memdown dev dependencies

## v1.14.1
* Rename upload-sms-from-csv command

## v1.14.0
* Add support for uploading SMS from CSV files

## v1.13.0
* Add templating support to Nools definition file

## v1.12.1
* Add more documentation for medic-logs

## v1.12.0
* Add script for fetching logs from prod servers
* Enable verbose output for jshint

## v1.11.11
* Revert "Clean up arg processing"

## v1.11.10
* Bump version for release
* Clean up arg processing
* Bump version for release
* Give friendlier error messages when ddoc is missing from server
* Display a better error message when api not available

## v1.11.8
* Allow creation of user docs from a CSV file

## v1.11.7
* Ignore hidden files when recursing project dirs
* Rename var

## v1.11.6
* URL-encode passwords entered on CLI

## v1.11.5
* [fetch-forms-from-google-drive] Store/re-use sessions
* Fix typo

## v1.11.4
* Add SVG compression, split compress-images

## v1.11.3
* Bump version for release
* Fix emoji support in windows
* Fixed the download from Google Drive
* Random package-lock change for npm's entertainment

## v1.11.2
* [convert-contact-forms] fix re-ordering if -create/-edit suffix not present

## v1.11.1
* [convert-contact-forms] support forms without 'init' group
* Updated readme to include GET

## v1.11.0
* release 1.11.0
* [csv-to-docs] Add optional GET to matchers
* [csv-to-docs] Update match column handling
* Fix broken test
* Add missing semicolon

## v1.10.1
* Don't allow unmasked password entry via --instance

## v1.10.0
* Add action: delete-forms

## v1.9.4
* Add support for COUCH_URL instance var

## v1.9.3
* Fix pyxform install instructions
* Add SVG squashing to TODO list
* Run tests in different timezones

## v1.9.2
* Add support for SVG attachments
* Set working directory for testing to build/test
* Add push step to npm release

## v1.9.1
* [upload-docs] fix name of log file

## v1.9.0
* Handle derivative configs
* [fetch-forms-from-google-drive] update README

## v1.8.0
* Add action to download forms from google drive
* Add simple test for compile-app-settings
* Restructure test data to remove custom copying

## v1.7.8
* [upload-to-docs] write report to file

## v1.7.7
* [progress-bar] reduce width to fit on windows terminal

## v1.7.6
* Add time-remaining counter to progress bar

## v1.7.5
* Improve error logging

## v1.7.4
* [upload-docs] fix broken promise chain on backoff

## v1.7.3
* [upload-docs] on ESOCKETTIMEDOUT, try smaller batch
* [travis] add explicit build for node 8

## v1.7.2
* Bump version
* [progress-bar/upload-docs] fix jshint violations
* Assign api-stub testing port dynamically

## v1.7.1
* [upload-docs] add progress bar
* [upload-docs] improve logging

## v1.7.0

## v1.6.20
* Final beta release to deprecate the beta
* Rename project and node module to medic-conf

## v1.6.16
* [upload-docs] improve logging
* [upload-docs] update test
* Resolve TODO
* Resolve TODO
* Resolve FIXME
* Resolve TODO
* Add npm script for releasing

## v1.6.15
* [upload-docs] increase batch size to 100

## v1.6.14
* Add configurable log level
* Remove unnecessarily-verbose logging
* [upload-docs] add tests
* [csv-to-docs] remove unnecessary mkdir() call
* Allow skipping check for updated versions

## v1.6.13
* [csv-to-docs] exclude circular doc references

## v1.6.12
* [csv-to-docs] fix path matching on windows

## v1.6.11
* [csv-to-docs] throw error if CSV contains reserved property names

## v1.6.10
* [csv-to-docs] Clarify doc and csv references
* Include stacktrace in error logging

## v1.6.9
* [upload-docs] include imported_date field
* [upload-docs] include reason in failure reports

## v1.6.8
* Change report doc.type field to data_record

## v1.6.7
* csv-to-docs: add timestamp column type

## v1.6.6
* [csv-to-docs] allow references by column-value
* [csv-to-docs] Don't generate doc IDs based on URL

## v1.6.5
* Fix bug in delete-all-forms action

## v1.6.4
* Make forms/collect directory in project layout
* Fix jshint warning

## v1.6.3
* Fix initialise-project-layout
* Clean up variable scoping
* Add more logging to check-for-updates

## v1.6.2
* Make form ID extraction regex safer
* Add more logging to upload-forms

## v1.6.1
* Fail to start if node version is lower than required
* Add upload-docs and csv-to-docs actions
* Don't include unnecessary pouch dependencies

## v1.6.0
* Bump version to 1.6.0
* Move new contact creation form to first page
* Move custom place name field when converting contact forms
* Add link to travis in README
* Update build badge
* Fix order of shell-completion test expectations
* Correct order of supported actions array
* Refactor contact form fiddling for clarity
* Fix Travis build
* Fix jshint - add missing semicolon

## v1.5.11
* Add check for updates to common execution targets
* Make new version warning clearer

## v1.5.10
* Add deprecation warning for repeat-relevant

## v1.5.9
* Add command to check for updates

## v1.5.8
* Display help if no args are supplied

## v1.5.7
* Add installation instructions for Windows
* Travis: remove node versions 4 and 5 from test matrix
* Travis: npm install before trying to run tests
* Travis: install pyxform-medic
* Travis: specify node versions
* Escape yml better(?) in travis config
* Add travis build badge

## v1.5.6
* Generate place forms if place-types.json is supplied
* Don't copy irrelevant files in form conversion tests

## v1.5.5
* Add note on how to upgrade

## v1.5.4
* Use form title included in properties file

## v1.5.3
* Allow default form language for collect

## v1.5.2
* Warn when uploading to non-matching dev servers

## v1.5.1
* Add for contact-summary <instance> element to app forms

## v1.5.0
* Upgrade to latest pyxform

## v1.4.2
* Fix pouch constructors
* Remove wishlist item which seems unimportant
* Remove resolved TODO item
* Simplify TODO

## v1.4.1
* Increase db connection timeouts

## v1.4.0
* Make form upload sequential
* Update pyxform installation instructions

## v1.3.0
* Fix bug in forms missing <inputs> section
* Remove bad commit of new pyxform flag
* Fail travis build if .only() calls found in tests
* Restrict mocha to running .spec.js files
* Remove .only from test
* Remove test .only() call
* Update installation instructions for pyxform-medic
* Remove pointless logging from convert-app-forms test
* Remove resolved TODO
* Warn when temp files are found in the test data dir
* Remove outdated TODO item
* Remove outdated TODO item

## v1.2.1
* Fix and simplify shell completion script

## v1.2.0
* Make URL specification simpler via --local --instance and --url opts

## v1.1.8
* Add warning when supplied URL ends in /medic

## v1.1.7
* Add convert step for Collect forms
* Add test forms for convert-app-forms
* Replace grunt with npm scripts

## v1.1.6
* Move colours out of readline-sync call, as they're not supported on Windows

## v1.1.5
* Match production URL properly when trying to warn about bad uploads

## v1.1.4
* Redact basic auth credentials when confirming upload URL

## v1.1.3
* Refactor expected project layout a bit

## v1.1.2
* Warn instead of fail if resources.json is missing

## v1.1.1
* Confirm upload before pushing to production server
* Fix import order

## v1.1.0
* Upload config FROM THE CURRENT DIRECTORY
* Support arg divider properly
* WARN if form dirs are missing
* Bump version for release
* Fix including error content in log
* Handle app_settings upload errors
* Handle attachment paths properly on Windows
* Add support for medic-collect forms
* Fix model juggling in contact forms
* Revert "Fix XML model juggling in contact forms"
* Fix XML model juggling in contact forms
* Add hidden tag to model elements listed in props.hidden_fields
* Allow inclusion of title translations from forms properties file
* Remove NO_LABEL labels when converting forms
* Make action list easier to read in log output
* Make terminal output pretty colours
* Fix logging of JSON objects
* Correct position of action in usage CLI output
* Don't use colons in form backup filenames
* Update bash-completion instructions in README
* Bump version number for release
* Fix command name in usage text
* Categorise TODO list
* Ignore Excel owner files when converting XLS to Xform
* Bump version number
* Add action for creating project folder structure
* Remove unused import in convert-forms
* Fix contat-summary.js file name in README
* Bump version number
* Only show "command missing" error if xls2xform not found
* Pull xls2xform executable name into a constant
* Only display pyxform installation suggestion if xls2xform cannot be found
* Add `sudo` to xls2xform-installation-command
* Update comment for accuracy
* Add TODO item
* Add TODO item
* Simplify installation instructions
* Bump version number
* Add separate installation instructions for ubuntu
* Add TODO item
* Fix typo in command name in README
* Add TODO item
* Update links to pyxform to point to medic branch
* Add `beta-` prefix to output of `--version`
* Don't force data node name change in XML conversion for app forms
* Add TODO item
* Add URL completion to shell-completion
* Add jshint grunt task for checking test files
* Add unit tests for shell-completion
* Add helpful commentary to bash shell-completion script
* Add TODO item
* Remove completed TODO items
* Redact basic auth URLs before printing to log
* Add TODO items
* Add TODO item
* Add default context for person forms
* Use the correct IDs for doc._id and doc.internalId
* Add TODO item
* Update pyxform installation instructions
* Rename pyxform-medic
* Allow some actions to be performed on specific forms
* Move shell completion setup to separate module
* Fix bash completion with colons in
* Add TODO item
* Fix completion script output
* Add TODO item
* Fix pngout binary link
* More shell completion tweaking
* Fix shell completion bin
* Add shell completion for bash
* Oh, jshint :¬(
* Move binary file to have proper js extension
* Add version and help cli switches
* Add TODO item
* Warn when properties in `<form>.properties.json` are ignored
* Added TODO item
* Base form upload on XML files, not XLSX
* Update location of form media directory
* Still upload a form even if it has no dir
* Remove completed TODO item
* Use `path` from `fs`
* Bump version
* Move XML elements around in form model when converting
* Add TODO item
* Add a helpful comment
* Create temp directories in the temp directory
* Delete lines that ask for it
* Force contact forms to use <model><instance><data/></../..>
* Make paths a little cleaner
* Include meta section when fixing forms
* Add new TODO
* Fix form attachments within directories
* Fix branckets and remove potentially pointless "fix" code from form converter
* Run form conversions in series
* Clean forms a bit more when converting
* Add TODO items
* Fix form conversion for new form location
* Change location of XML file
* Separate attachment-from-file function
* Remove pointless debug form compress-images
* Restructure forms to separate contact and app forms
* Remove completed README item
* Add compress-images action
* Move XML fix to convert-forms
* Handle unsupported actions better
* Clean up sync-fs exports
* Simplify CLI script
* Update TODO list
* Add installation instructions if medic-xls2xform is missing
* Fix imports in convert-forms
* Bump version number for release
* Add convert forms action; convert XLS forms before upload
* Remove console.log() use on errors
* Move get-filename-without-extension function to sync-fs
* Add more logging to upload-form action
* Non-0 exit code on CLI error
* Close promise chain for specific-action calls
* Fix bug reassigning xml in convert-forms
* Bump version for release
* Fix forms before uploading by removing the `default="true()"` attribute
* Bump version number for release
* Allow running multiple actions in a row with a single CLI call
* Use ES6 func syntax in Gruntfile
* Convert tabs to spaces in Gruntfile
* Add travis build file
* Add mocha for testing
* More clean up of log levels and messages
* Remove noisy log extras from do-all script
* Fix `medic-conf` command reference in README
* Update README to reflect contact form name change
* Bump npm version for release
* Read form ID from XML
* Windows compat: convert `-` character in form names to `:` in form IDs
* Remove dead code
* Safer error message
* Update structure of task-related files
* Bump npm version number for release
* Remove unused var
* Improve error messages when compiling app_settings.json
* Bump npm version for release
* Strip inline comments when cleaning javascript
* Change README examples to be for a specific project
* Bump npm version for release
* Add support for uploading custom translations
* Rename insert-or-update to insert-or-replace
* Bump npm version for release
* Include internalId property when uploading forms
* Add TODO item
* Bump npm version number for release
* Allow missing directories in attachments-from-dir
* Rename schedules.json as tasks.json
* Bump npm version for release
* Allow performing of specific actions
* Calculate couchUrl in CLI parent script
* Move usage script to more obvious place
* Refactor logging code
* Make logging neater
* Remove annoying console.log
* Restructure directory layout
* Move upload of translations from TODO to Might Support
* Add list of supported functionality to README
* Update project structure example for .properties.json file
* Remove `ignore` option from attachments-from-dir
* Format code blocks in README
* Add README item
* Add TODO items
* Bump version number
* Update expectation for form properties file location
* Add expected project structure to README
* Add support for icon uploads
* Add TODO
* Bump version number for npm
* Add readme
* Add jshint and fix violations
* Bump npm version number
* Make CLI output calls clearer
* Put CLI script imports back in the right place
* Add bin target

## v1.0.0
* Add `-beta` suffix to package name before uploading to NPM
* Allow setting of internalId field, but include deprecation warning

