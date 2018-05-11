# Changelog

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

