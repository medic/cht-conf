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

## App Settings

* compile from:
  - tasks
  - rules
  - schedules
  - contact-summary
  - purge
* backup from server
* upload to server

## Forms

* fetch from Google Drive and save locally as `.xlsx`
* backup from server
* delete all forms from server
* delete specific form from server
* upload all app or contact forms to server
* upload specified app or contact forms to server

## Resources

* upload to server

## Translations

* upload custom translations to the server

## Uploading data

* Convert CSV files with contacts and reports to JSON
* Upload JSON files to instance

## Moving Contacts within the Hierarchy

Contacts are organized into a hierarchy. It is not straight-forward to move contacts from one position in the hierarchy to another because many copies of this hierarchy exist. Use the `move-contacts` action to assign a new parent to contacts. This command will move the specified contact, all the contacts under that contact, and all reports created by any of those contacts. This action will download all documents that need to be updated, update the lineages within those documents, and then save the updated documents on your local disk. To commit those changes to the database, run the `upload-docs` action.

**Offline users who have contacts removed from their visible hierarchy will not automatically see those contacts disappear. The contact remains on the user's device. Any updates made to the contact (or any reports created for that contact) will silently fail to sync (medic/medic/#5701). These users must be encouraged to clear cache and resync!** Also impactful, but less serious - this script can cause significant amounts of changes to the database and offline users who have contacts moved into their visible hierarchy may experience lengthy and bandwidth-intensive synchronizations.

Parameter | Description | Required
-- | -- | --
contacts | Comma delimited list of contact IDs which will be moved | Yes
parent | ID of the new parent which will be assigned to the provided contacts | Yes
docDirectoryPath | This action outputs files to local disk at this destination | No. Default `json-docs`

Some constraints when moving contacts:

* **Allowed Parents** - When moving contacts on WebApp &gt;v3.7, your chosen parent must be listed as a valid parent for the contact as defined in the [configuration for place hierarchy](https://github.com/medic/medic-docs/blob/master/configuration/app-settings.md#configuring-place-hierarchy). For WebApp &lt;v3.7, the default hierarchy is enforced.
* **Circular Hierarchy** - Nobody's parent can ever be themself or their child.
* **Primary Contacts** - Primary contacts must be a descendant of the place for which they are the primary contact. You may need to select a new primary contact for a place through the WebApp if you'd like to move a primary contact to a new place in the hierarchy.
* **Minification** - Due to contact "minification" (#2635) which was implemented in v2.13, this script should not be used for versions prior to v2.13.

### Examples
Move the contacts with the id `contact_1` and `contact_2` to have the parent `parent_id`. The changes will be in the local folder `my_folder` only for review. Run the second command to upload the changes after review.

    medic-conf --instance= move-contacts -- --contacts=contact_1,contact_2 --parent=parent_id --docDirectoryPath=my_folder
    medic-conf --local upload-docs -- --docDirectoryPath=my_folder

Move the contact with the id `contact_1` to the top of the hierarchy (no parent).

    medic-conf --local move-contacts upload-docs -- --contacts=contact_1 --parent=root


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

## compress images

To compress PNGs and SVGs in the current directory and its subdirectories, two commands are available:

	compress-pngs
	compress-svgs

## Wishlist

* only upload things which have changed (this could be a separate mode - e.g. `update` vs `configure`)

# Releasing

## Do I need to update `release-notes.md`?

As we strive to have clear, readable commit messages for every change, [release-notes.md](./release-notes.md) should not be updated for every single change. Instead, it should be used as a forum for deep information about significant changes, breaking changes, changes to interfaces, changes in behavior, new feature details, etc.

## Performing the release

1. Create a pull request with prep for the new release. This should contain changes to release notes if required and anything else that needs to be done:
1. Get it reviewed and approved
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

Copyright 2013-2018 Medic Mobile, Inc. <hello@medicmobile.org>

# License

The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.
