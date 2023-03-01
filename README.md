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

CHT Conf can also be run from within a Docker container. This is useful if you already have Docker installed and do not wish to configure the various dependencies required for developing CHT apps on your local machine. The necessary dependencies are pre-packaged in the Docker image.

#### Building the image

Run the following commands to create a new project directory and build the Docker image:

```shell
mkdir cht-project
cd cht-project
curl https://raw.githubusercontent.com/medic/cht-conf/main/Dockerfile > Dockerfile
docker build -t cht-conf .
```

#### Using the image

The resulting Docker image can be used as a [VSCode Development Container](https://code.visualstudio.com/docs/devcontainers/containers) (easiest) or as a standalone Docker utility.

##### VSCode Development Container

If you want to develop CHT apps with VSCode, you can use the Docker image as a Development Container. This will allow you to use the `cht-conf` utility and its associated tech stack from within VSCode (without needing to install dependencies like NodeJS on your host system).

[Install VSCode](https://code.visualstudio.com/) if you do not have it already.

Run the following commands from within your project directory to download the `.devcontainer.json` config file, install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers), and open the project directory in VSCode:

```shell
curl https://raw.githubusercontent.com/medic/cht-conf/dev-container/.devcontainer.json > .devcontainer.json
code --install-extension ms-vscode-remote.remote-containers
code -n .
```

Open the Command Palette in VSCode (_Ctrl+Shift+P_ or _Cmd+Shift+P_) and select `Reopen in Container`. This will open your workspace inside the `cht-conf` container. You can use the `cht` commands by opening a terminal in VSCode (_Ctrl+Shift+\`_ or _Cmd+Shift+\`_).

Run the following command in the VSCode terminal to bootstrap your new CHT project:

```shell
cht initialise-project-layout
```

###### Terminal environment

When opening a terminal in VSCode in a development container, the terminal will be running on the _container environment_ by default. This is what gives you access to the various `cht` commands.  However, this also means you do NOT have access, within the default VSCode terminal, to commands from your _host environment_. So, for example, you cannot run `docker` commands since Docker is not installed inside the container.

To open a terminal running on you _host environment_ in VSCode, open the Command Palette (_Ctrl+Shift+P_ or _Cmd+Shift+P_) and select `Create New Integrated Terminal (Local)`. Just remember that you will NOT be able to run `cht` commands from this terminal since cht-conf is not installed on your host machine.

##### Standalone Docker utility

If you are not using VSCode, you can use the Docker image as a standalone utility from the command line.  Instead of using the `cht ...` command, you can run `docker run -it --rm -v "$PWD":/workdir cht-conf ...`. This will create an ephemeral container with access to your current directory that will run the given cht command. 

Run the following command inside the project directory to bootstrap your new CHT project:

```shell
docker run -it --rm -v "$PWD":/workdir cht-conf initialise-project-layout
```

#### Note on connecting to a local CHT instance

When using `cht-conf` within a Docker container to connect to a CHT instance that is running on your local machine (e.g. a development instance), you cannot use the `--local` flag or `localhost` in your `--url` parameter (since these will be interpreted as "local to the container"). 

It is recommended to run a local CHT instance using the [CHT Docker Helper script](https://docs.communityhealthtoolkit.org/apps/guides/hosting/4.x/app-developer/). You can connect to the resulting `...my.local-ip.co` URL from the Docker container (or the VSCode terminal). (Just make sure the port your CHT instance is hosted on is not blocked by your firewall). 

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

1. Checkout the default branch, for example `main`
1. Run `npm version --no-git-tag-version <major>.<minor>.<patch>-beta.1`. This will only update the versions in `package.json` and `package-lock.json`. It will not create a git tag and not create an associated commit.
1. Run `npm publish --tag beta`. This will publish your beta tag to npm's beta channel.

To install from the beta channel, run `npm install cht-conf@beta`.

## Build status

Builds brought to you courtesy of GitHub actions. 

<img src="https://github.com/medic/cht-conf/actions/workflows/build.yml/badge.svg">

# Copyright

Copyright 2013-2022 Medic Mobile, Inc. <hello@medic.org>

# License

The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.
