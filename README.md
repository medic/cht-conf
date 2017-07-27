Medic Project Configurer
========================

# Requirements

* nodejs 6
* python 2.7


# Installation

	npm install -g medic-configurer-beta
	sudo python -m pip install git+https://github.com/medic/pyxform.git@master#egg=pyxform-medic

Note: on some setups, e.g. OSX, `sudo` may not be required when installing `pyxform-medic`.

## Bash completion

To enable tab completion in bash, add the following to your `.bashrc`/`.bash_profile`:

	eval "$(medic-conf --shell-completion bash)"

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
* make form upload sequential
* add PNGout as somehow part of the form conversion step.  But make sure it's cleanly separated from XML processing step
* define configure-all as separate action; convert argument order to <action>-first?  How to allow multiple actions (if at all?)?

## Wishlist

* make error logs shorter
* only upload things which have changed (this could be a separate mode - e.g. `update` vs `configure`)
* require manual confirmation of upload if url is *.app.medicmobile.org and either git is not available, or the working directory is dirty or has new files
* parse xls2xform JSON output and display nicely

## For official release

* move `npm publish` to travis and rename module to `medic-configurer`
* remove `beta-` prefix from `--version` output
