Medic Project Configurer
========================

# Requirements

* nodejs 6
* python 2.7


# Installation

	npm install -g medic-configurer-beta
	python -m pip install -e git+https://github.com/alxndrsn/pyxform.git@master#egg=medic-pyxform

# Use

## Upload all config

	medic-conf example-project http://admin:pass@localhost:5984

## Perform specific action(s)

	medic-config example-project http://admin:pass@localhost:5984 <...action>

The list of available actions can be seen in [`supported-actions.js`](https://github.com/alxndrsn/medic-configurer/blob/master/src/cli/supported-actions.js).

# Project Layout

This tool expects a project to be sctructured as follows:

	example-project/
		app_settings.json
		contact-summary.json
		resources.json
		resources/
			icon-one.png
			…
		targets.json
		tasks/
			rules.nools.js
			schedules.json
		forms/
			app/
				my_project_form.xlsx
				my_project_form.xml
				my_project_form.properties.json
				my_project_form/
					[extra files]
					…
			contact/
				person-create.xlsx
				person-create.xml
				person-create/
					[extra files]
					…
			…
			…
		translations/
			messages-xx.properties
			…


# Currently supported

## App Settings

* compile from:
  - tasks
  - rules
  - schedules
  - contact-summary
* backup from server
* upload to server

## Forms

* backup from server
* delete from server
* upload to server

## Resources

* upload to server

## Translations

* upload of custom translations to the server

# TODO

* apply all necessary transforms to contact forms
* add bash tab-completion
* only upload things which have changed (this could be a separate mode - e.g. `update` vs `configure`)
* require manual confirmation of upload if url is *.app.medicmobile.org and either git is not available, or the working directory is dirty or has new files
* move `npm publish` to travis and rename module to `medic-configurer`
* support Google Sheets forms
* support Collect forms
