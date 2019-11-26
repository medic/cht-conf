Medic Project Configurer
========================

Medic Conf is a command-line interface tool to manage and configure your apps built using the [Core Framework](https://github.com/medic/cht-core) of the [Community Health Toolkit](https://communityhealthtoolkit.org).

# Requirements

* nodejs 8 or later
* python 2.7
* or Docker


# Installation

## Docker

	docker build -t medic-conf:v0 .
	docker run medic-conf:v0
	docker exec -it <container_name> /bin/bash

## Ubuntu

	npm install -g medic-conf
	sudo python -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic

## OSX

	npm install -g medic-conf
	pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic

## Windows

As Administrator:

	npm install -g medic-conf
	python -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic --upgrade

## Bash completion

To enable tab completion in bash, add the following to your `.bashrc`/`.bash_profile`:

	eval "$(medic-conf --shell-completion=bash)"

## Upgrading

To upgrade to the latest version

	npm install -g medic-conf

# Usage

`medic-conf` will upload the configuration **_from your current directory_**.

## Specifying the server to configure

If you are using the default actionset, or performing any actions that require a CHT instance to function (e.g. `upload-xyz` or `backup-xyz` actions) you must specify the server you'd like to function against.

### localhost

For developers, this is the instance defined in your `COUCH_URL` environment variable.

	medic-conf --local

### A specific Medic Mobile instance

For configuring against Medic Mobile-hosted instances.

	medic-conf --instance=instance-name.dev

Username `admin` is used.  A prompt is shown for entering password.

If a different username is required, add the `--user` switch:

	--user user-name --instance=instance-name.dev

### An arbitrary URL

	medic-conf --url=https://username:password@example.com:12345

### Into an archive to be uploaded later

  medic-conf --archive

The resulting archive is consumable by Medic's API >v3.7 to create default configurations.

## Perform specific action(s)

	medic-conf <--archive|--local|--instance=instance-name|--url=url> <...action>

The list of available actions can be seen via `medic-conf --help`.

## Perform actions for specific forms

	medic-conf <--local|--instance=instance-name|--url=url> <...action> -- <...form>

# Currently supported

## Settings

* compile app settings from:
  - tasks
  - rules
  - schedules
  - contact-summary
  - purge
* backup app settings from server
* upload app settings to server
* upload resources to server
* upload custom translations to the server

## Forms

* fetch from Google Drive and save locally as `.xlsx`
* backup from server
* delete all forms from server
* delete specific form from server
* upload all app or contact forms to server
* upload specified app or contact forms to server

## Managing data and images

* convert CSV files with contacts and reports to JSON docs
* move contacts by downloading and making the changes locally first
* upload JSON files as docs on instance
* compress PNGs and SVGs in the current directory and its subdirectories

## Editing contacts across the hierarchy. 
To edit existing couchdb documents, create a CSV file that contains the id's of the document you wish to update, and the columns of the document attribute(s) you wish to add/edit. By default, values are parsed as strings. To parse a CSV column as a JSON type, refer to the [Property Types](#property-types) section to see how you can parse the values to different types. Also refer to the [Excluded Columns](#excluded-columns)section to see how to exclude column(s) from being added to the docs.

Parameter | Description | Required 
-- | -- | --
column(s) | Comma delimited list of columns you wish to add/edit. If this is not specified all columns will be added. | No
docDirectoryPath | This action outputs files to local disk at this destination | No. Default `json-docs`


### Example
1. Create a contact.csv file with your columns in the csv folder in your current path. The uuid column is a requirement. (The uuid column contains the document IDs to be fetched from couchdb.) 

| uuid | is_in_emnch:bool |
| ----------------- | ---------------- |
| uuid_1            | false            |
| uuid_2            | false            |
| uuid_3            | true             |

1. Use the following command to download and edit the documents:

```
medic-conf --instance=*instance* edit-contacts -- --column=*is_in_emnch* --docDirectoryPath=*my_folder*
```
1. Then upload the edited documents using the [upload-docs ](#examples) command.


# Project Layout

This tool expects a project to be structured as follows:

	example-project/
		.eslintrc
		app_settings.json
		contact-summary.js
		purge.js
		resources.json
		resources/
			icon-one.png
			…
		targets.js
		tasks.js
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

If you are starting from scratch you can initialise the file layout using the `initialise-project-layout` action:

    medic-conf initialise-project-layout

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

# `medic-logs`

Fetch logs from a production server.

This is a standalone command installed alongside `medic-conf`.  For usage information, run `medic-logs --help`.

## Usage

	medic-logs <instance-name> <log-types...>

Accepted log types:

	api
	couchdb
	gardener
	nginx
	sentinel

## Testing Locally

1. Clone the project locally
1. Make changes to medic-conf or checkout a branch for testing
1. Test changes
	1. To test CLI changes locally you can run `node <project_dir>/src/bin/medic-conf.js`. This will run as if you installed via npm.
	1. To test changes that are imported in code run `npm install <project_dir>` to use the local version of medic-conf.

# Releasing

1. Create a pull request with prep for the new release. This should contain changes to release notes if required and anything else that needs to be done. As commit messages should be clear and readable for every change, [release-notes.md](./release-notes.md) does not need to be updated for every single change. Instead, it should include information about significant changes, breaking changes, changes to interfaces, changes in behavior, new feature details, etc.
1. Get the pull request reviewed and approved
1. Run `npm version patch`, `npm version minor`, or `npm version major` as appropriate. This will:
    - Update versions in `package.json` and `package-lock.json`
    - Commit those changes locally and tag that commit with the new version
    - "Compile" and publish the changes to npm
1. `git push && git push --tags` to push the npm generated commit and tag up to your pre-approved pull request
1. Merge the pull request back into master

# Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/cht-conf).

<a href="https://travis-ci.org/medic/medic-conf"><img src="https://travis-ci.org/medic/medic-conf.svg?branch=master"/></a>

# Copyright

Copyright 2013-2019 Medic Mobile, Inc. <hello@medicmobile.org>

# License

The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.
