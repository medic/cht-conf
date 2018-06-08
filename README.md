Medic Project Configurer
========================

<a href="https://travis-ci.org/medic/medic-conf"><img src="https://travis-ci.org/medic/medic-conf.svg?branch=master"/></a>

# Requirements

* nodejs 6
* python 2.7


# Installation

## Ubuntu

	npm install -g medic-conf
	sudo python -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.5#egg=pyxform-medic

## OSX

	npm install -g medic-conf
	pip install git+https://github.com/medic/pyxform.git@medic-conf-1.5#egg=pyxform-medic

## Windows

As Administrator:

	npm install -g medic-conf
	python -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.5#egg=pyxform-medic --upgrade

## Bash completion

To enable tab completion in bash, add the following to your `.bashrc`/`.bash_profile`:

	eval "$(medic-conf --shell-completion bash)"

## Upgrading

To upgrade to the latest version

	npm install -g medic-conf

# Use

`medic-conf` will upload the configuration **_from your current directory_**.

## Upload all config

### To localhost

	medic-conf --local

### To a specific Medic instance

	medic-conf --instance instance-name.dev

Username `admin` is used.  A prompt is shown for entering password.

If a different username is required, add the `--user` switch:

	--user user-name --instance instance-name.dev

### To an arbitrary URL

	medic-conf --url https://username:password@example.com:12345

## Perform specific action(s)

	medic-conf <--local|--instance instance-name|--url url> <...action>

The list of available actions can be seen in [`supported-actions.js`](https://github.com/medic/medic-conf/blob/master/src/cli/supported-actions.js).

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
		task-schedules.json
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

## Derived configs

Configuration can be inherited from another project, and then modified.  This allows the `app_settings.json` and contained files (`task-schedules.json`, `targets.json` etc.) to be imported, and then modified.

To achieve this, create a file called `settings.inherit.json` in your project's root directory with the following format:

	{
		"inherit": "../path/to/other/project",
		"replace": {
			"keys.to.replace": "value-to-replace-it-with"
		},
		"merge": {
			"complex.objects": {
				"will_be_merged": true
			}
		},
		"delete": [
			"all.keys.listed.here",
			"will.be.deleted"
		],
		"filter": {
			"object.at.this.key": [
				"will",
				"keep",
				"only",
				"these",
				"properties"
			]
		}
	}


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

* fetch from google docs/google sheets/google drive and save locally as `.xlsx`
* backup from server
* delete all forms from server
* delete specific form from server
* upload to server

## Resources

* upload to server

## Translations

* upload of custom translations to the server

## Wishlist

* only upload things which have changed (this could be a separate mode - e.g. `update` vs `configure`)

# create-users **[ALPHA]**

N.B. this feature is currently in development, and probably not ready for production yet.

To create users on a remote server, use the `create-users` action.  The CSV file should be called `users.csv`, and an example is available [in the tests directory](test/data/create-users/users.csv).

# csv-to-docs

To convert CSV to JSON docs, use the `csv-to-docs` action.

## property types

By default, values are parsed as strings.  To parse a CSV column as a JSON type, suffix a data type to the column definition, e.g.

	column_one,column_two:bool,column_three:int,column_four:float,column_five:date,column_six:timestamp

This would create a structure such as:

	{
		"_id": "09efb53f-9cd8-524c-9dfd-f62c242f1817",
		"column_one": "some string",
		"column_two": true,
		"column_three": 1,
		"column_four": 2.3,
		"column_five": "2017-12-31T00:00:00.000Z",
		"column_six": 1513255007072
	}

## excluded columns

To exclude a column from the final object structure, give it the type `excluded`:

	my_column_that_will_not_be_a_property:excluded

This can be useful if using a column for doc references.

## doc references

To reference other docs, replace the type suffix with a matching clause:

	GET location:place WHERE external_id=COL_VAL

This would create a structure such as:

	{
		"_id": "09efb53f-9cd8-524c-9dfd-f62c242f1817",
		"location": {
		"_id": "7ac33d1f-10d8-5198-b39d-9d61595292f6"
			"name": "some place"
		}
	}

## doc property references

To reference specific properties of other docs:

	GET location:_id OF place WHERE external_id=COL_VAL

This would create a structure such as:

	{
		"_id": "09efb53f-9cd8-524c-9dfd-f62c242f1817",
		"location": "7ac33d1f-10d8-5198-b39d-9d61595292f6"
	}

Note the special string `COL_VAL` - this matches the CSV column value for the row being processed.

# medic-logs

Fetch logs from a production server.

## Usage

	medic-logs <instance-name> <log-types...>

Accepted log types:

	api
	couchdb
	gardener
	nginx
	sentinel
