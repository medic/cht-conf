Medic Project Configurer
========================


# Installation

npm install -g medic-configurer-beta


# Use

medic-config lg-uganda http://admin:pass@localhost:5984


# Project Layout

This tool expects a project to be sctructured as follows:

	/
		app_settings.json
		contact-summary.json
		nools.json
		resources.json
		resources/
			icon-one.png
			…
		schedules.json
		targets.json
		forms/
			contact:person:create.xlsx
			…
			my_project_form.xlsx
			my_project_form.json
			my_project_form/
				xml
				…
			…


# TODO

* support form XSL -> XML conversion
* support uploading translations
* only upload things which have changed (this could be a separate mode - e.g. `update` vs `configure`)
* require manual confirmation of upload if url is *.app.medicmobile.org and either git is not available, or the working directory is dirty or has new files
