Medic Project Configurer
========================

<a href="https://travis-ci.org/medic/medic-configurer"><img src="https://travis-ci.org/medic/medic-configurer.svg?branch=master"/></a>

# Requirements

* nodejs 6
* python 2.7


# Installation

## Ubuntu

	npm install -g medic-configurer-beta
	sudo python -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.5#egg=pyxform-medic

## OSX

	npm install -g medic-configurer-beta
	pip install git+https://github.com/medic/pyxform.git@medic-conf-1.5#egg=pyxform-medic

## Windows

As Administrator:

	npm install -g medic-configurer-beta
	python -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.5#egg=pyxform-medic --upgrade

## Bash completion

To enable tab completion in bash, add the following to your `.bashrc`/`.bash_profile`:

	eval "$(medic-conf --shell-completion bash)"

## Upgrading

To upgrade to the latest version

	npm install -g medic-configurer-beta

# Use

`medic-conf` will upload the configuration **_from your current directory_**.

## Upload all config

### To localhost

	medic-conf --local

### To a specific Medic instance

	medic-conf --instance username:password@instance-name.dev

### To an arbitrary URL

	medic-conf --url https://username:password@example.com:12345

## Perform specific action(s)

	medic-conf <--local|--instance instance-name|--url url> <...action>

The list of available actions can be seen in [`supported-actions.js`](https://github.com/alxndrsn/medic-configurer/blob/master/src/cli/supported-actions.js).

## Perform actions for specific forms

	medic-conf <--local|--instance instance-name|--url url> <...action> -- <...form>

# Project Layout

This tool expects a project to be sctructured as follows:

	example-project/
		app_settings.json
		contact-summary.js
		resources.json
		resources/
			icon-one.png
			…
		rules.nools.js
		targets.json
		tasks.json
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

* support Google Sheets forms
* add PNGout as somehow part of the form conversion step.  But make sure it's cleanly separated from XML processing step

## Wishlist

* only upload things which have changed (this could be a separate mode - e.g. `update` vs `configure`)

## For official release

* rename module to `medic-configurer`
* remove `beta-` prefix from `--version` output

# csv-to-docs

To convert CSV to JSON docs, use the `csv-to-docs` action.

By default, values are parsed as strings.  To parse a CSV column as a JSON type, prefix a data type to the column definition, e.g.

	column_1,bool:column_2,int:column_3,date:column_4

To reference other docs, there are a number of options:

## Reference to a row of CSV

1. `_id` of doc at row `N` of csv file `F`

	csv:F:id>target_property_name

2. entire doc at row `N` of csv file `F`

	csv:F:doc>target_property_name

3. value of field `some_field` of doc at row `N` of csv file `F`

	csv:F:.some_field>target_property_name

## Reference to a doc by matching properties

1. `_id` of doc with properties X=a and Y=b where property P matches this column's value

	match=P:X=a&Y=y:id>target_property_name

2. entire doc with properties X=a and Y=b where property P matches this column's value

	match=P:X=a&Y=y:doc>target_property_name

3. value of field `some_field` of doc with properties X=a and Y=b where property P matches this column's value

	match=P:X=a&Y=y:.some_field>target_property_name
