Medic Project Configurer
========================

# Requirements

* nodejs 6
* python 2.7


# Installation

	npm install -g medic-configurer-beta
	sudo python -m pip install git+https://github.com/medic/pyxform.git@master#egg=pyxform-medic
	eval "$(medic-conf --shell-completion bash)"

Note: on some setups, e.g. OSX, `sudo` may not be required when installing `pyxform-medic`.

# Use

## Upload all config

	medic-conf example-project http://admin:pass@localhost:5984

## Perform specific action(s)

	medic-conf example-project http://admin:pass@localhost:5984 <...action>

The list of available actions can be seen in [`supported-actions.js`](https://github.com/alxndrsn/medic-configurer/blob/master/src/cli/supported-actions.js).

## Perform actions for specific forms

	medic-conf example-project http://admin:pass@localhost:5984 <...action> -- <...form>

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
				my_project_form-media/
					[extra files]
					…
			contact/
				person-create.xlsx
				person-create.xml
				person-create-media/
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

* only upload things which have changed (this could be a separate mode - e.g. `update` vs `configure`)
* require manual confirmation of upload if url is *.app.medicmobile.org and either git is not available, or the working directory is dirty or has new files
* move `npm publish` to travis and rename module to `medic-configurer`
* support Google Sheets forms
* support Collect forms
* make form upload sequential
* ignore Excel temp files when converting to XML - ~$clinic.xlsx
* make error logs shorter
* add task to create new project folder layout
* add PNGout as somehow part of the form conversion step.  But make sure it's cleanly separated from XML processing step
* remove `beta-` prefix from `--version` output
* define configure-all as separate action; convert argument order to <action>-first?  How to allow multiple actions (if at all?)?
