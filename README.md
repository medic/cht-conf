CHT App Configurer
========================

CHT Conf is a command-line interface tool to manage and configure your apps built using the [Core Framework](https://github.com/medic/cht-core) of the [Community Health Toolkit](https://communityhealthtoolkit.org).

# Requirements

* nodejs 8 or later
* python 2.7
* or Docker

# Installation

## Operating System Specific

### Ubuntu

	npm install -g cht-conf
	sudo python -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic

### OSX

	npm install -g cht-conf
	pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic

### Windows

As Administrator:

	npm install -g cht-conf
	python -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic --upgrade

### Docker

**NB** - `cht-conf` in a Docker container should only be used if you're familiar with running containers. You will have to copy or mount your config files into the container in order to be able to use the `cht` call to interact with a remote CHT instance.

Build and then run the `cht-conf` container:

	docker build -t cht-conf:v0 .
	docker run -d --name cht-conf cht-conf:v0

You now have a container running in the background called `cht-conf`. You can get a shell on this container with:

	docker exec -it cht-conf /bin/bash

And then you can run the utility with `cht`.  

When you are done with the container, you can stop it with:

	docker stop cht-conf

## Bash completion

To enable tab completion in bash, add the following to your `.bashrc`/`.bash_profile`:

	eval "$(cht-conf --shell-completion=bash)"

## Upgrading

To upgrade to the latest version

	npm install -g cht-conf

## Usage

`cht` will upload the configuration **from your current directory**.

## Specifying the server to configure

If you are using the default actionset, or performing any actions that require a CHT instance to function (e.g. `upload-xyz` or `backup-xyz` actions) you must specify the server you'd like to function against.

### localhost

For developers, this is the instance defined in your `COUCH_URL` environment variable.

	cht --local

### A specific Medic-hosted instance

For configuring Medic-hosted instances.

	cht --instance=instance-name.dev

Username `admin` is used. A prompt is shown for entering password.

If a different username is required, add the `--user` switch:

	--user user-name --instance=instance-name.dev

### An arbitrary URL

	cht --url=https://username:password@example.com:12345

**NB** - When specifying the URL with `--url`, be sure not to specify the CouchDB database name in the URL. The CHT API will find the correct database.

### Into an archive to be uploaded later

    cht --archive

The resulting archive is consumable by CHT API >v3.7 to create default configurations.

## Perform specific action(s)

	cht <--archive|--local|--instance=instance-name|--url=url> <...action>

The list of available actions can be seen via `cht --help`.

## Perform actions for specific forms

	cht <--local|--instance=instance-name|--url=url> <...action> -- <...form>

## Protecting against configuration overwriting

_Added in v3.2.0_

In order to avoid overwriting someone else's configuration cht-conf records the last uploaded configuration snapshot in the `.snapshots` directory. The `remote.json` file should be committed to your repository along with the associated configuration change. When uploading future configuration if cht-conf detects the snapshot doesn't match the configuration on the server you will be prompted to overwrite or cancel.

# Currently supported

## Settings

* compile app settings from:
  - tasks
  - rules
  - schedules
  - contact-summary
  - purge
* app settings can also be defined in a more modular way by having the following files in app_settings folder:
	- base_settings.json
	- forms.json
	- schedules.json
* backup app settings from server
* upload app settings to server
* upload resources to server
* upload custom translations to the server
* upload privacy policies to server
* upload branding to server
* upload partners to server

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
To edit existing couchdb documents, create a CSV file that contains the id's of the document you wish to update, and the columns of the document attribute(s) you wish to add/edit. By default, values are parsed as strings. To parse a CSV column as a JSON type, refer to the [Property Types](#property-types) section to see how you can parse the values to different types. Also refer to the [Excluded Columns](#excluded-columns) section to see how to exclude column(s) from being added to the docs.

Parameter | Description | Required
-- | -- | --
column(s) | Comma delimited list of columns you wish to add/edit. If this is not specified all columns will be added. | No
docDirectoryPath | This action outputs files to local disk at this destination | No. Default `json-docs`
file(s) | Comma delimited list of files you wish to process using edit-contacts. By default, contact.csv is searched for in the current directory and processed. | No.
updateOfflineDocs | If passed, this updates the docs already in the docDirectoryPath instead of downloading from the server. | No.


### Example
1. Create a contact.csv file with your columns in the csv folder in your current path. The documentID column is a requirement. (The documentID column contains the document IDs to be fetched from couchdb.)

	| documentID | is_in_emnch:bool |
	| ----------------- | ---------------- |
	| documentID1            | false            |
	| documentID2            | false            |
	| documentID3            | true             |

1. Use the following command to download and edit the documents:

	```
	cht --instance=*instance* edit-contacts -- --column=*is_in_emnch* --docDirectoryPath=*my_folder*
	```
	or this one to update already downloaded docs
	```
	cht --instance=*instance* edit-contacts -- --column=*is_in_emnch* --docDirectoryPath=*my_folder* --updateOfflineDocs
	```
1. Then upload the edited documents using the [upload-docs ](#examples) command.


# Project layout

This tool expects a project to be structured as follows:

	example-project/
		.eslintrc
		app_settings.json
		contact-summary.js
		privacy-policies.json
		privacy-policies/
		    language1.html
		    …
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

    cht initialise-project-layout

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

# Fetching logs

Fetch logs from a CHT v2.x production server.

This is a standalone command installed alongside `cht-conf`.  For usage information, run `cht-logs --help`.

## Usage

	cht-logs <instance-name> <log-types...>

Accepted log types:

	api
	couchdb
	gardener
	nginx
	sentinel

# Development

To develop a new action or improve an existing one, check the ["Actions" doc](src/fn/README.md).

## Testing

Execute `npm test` to run static analysis checks and the test suite. Requires Docker to run integration tests against a CouchDB instance. 

## Executing your local branch

1. Clone the project locally
1. Make changes to cht-conf or checkout a branch for testing
1. Test changes
	1. To test CLI changes locally you can run `node <project_dir>/src/bin/index.js`. This will run as if you installed via npm.
	1. To test changes that are imported in code run `npm install <project_dir>` to use the local version of cht-conf.

## Releasing

1. Create a pull request with prep for the new release. 
1. Get the pull request reviewed and approved.
1. When doing the squash and merge, make sure that your commit message is clear and readable and follows the strict format described in the commit format section below. If the commit message does not comply, automatic release will fail.
1. In case you are planning to merge the pull request with a merge commit, make sure that every commit in your branch respects the format. 
1. Announce the release on the [CHT forum](https://forum.communityhealthtoolkit.org), under the "Product - Releases" category.

### Commit format
The commit format should follow this [conventional-changelog angular preset](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular). Examples are provided below.

Type | Example commit message | Release type
-- | -- | --
Bug fixes | fix(#123): infinite spinner when clicking contacts tab twice | patch
Performance | perf(#789): lazily loaded angular modules | patch
Features | feat(#456): add home tab | minor
Non-code | chore(#123): update README | none
Breaking| perf(#2): remove reporting rates feature <br/> BREAKING CHANGE: reporting rates no longer supported | major



### Releasing betas

1. Checkout `master`
1. Run `npm version --no-git-tag-version <major>.<minor>.<patch>-beta.1`. This will only update the versions in `package.json` and `package-lock.json`. It will not create a git tag and not create an associated commit.
1. Run `npm publish --tag beta`. This will publish your beta tag to npm's beta channel.

To install from the beta channel, run `npm install cht-conf@beta`.

## Build status

Builds brought to you courtesy of GitHub actions. 

<img src="https://github.com/medic/cht-conf/actions/workflows/build.yml/badge.svg">

# Copyright

Copyright 2013-2019 Medic Mobile, Inc. <hello@medicmobile.org>

# License

The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.
