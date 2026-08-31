# cht-conf Action Reference

This document provides a summary of all supported actions in `cht-conf`. These actions can be executed by passing them as arguments to the `cht` command.

## Backup
- `backup-all-forms`: Downloads all forms from the CHT instance and saves them to the local project directory.
- `backup-app-settings`: Fetches the current application settings from the CHT instance and saves them to a local JSON file.

## Convert
- `convert-app-forms`: Processes local application XLSX forms into XML and Enketo-compatible formats.
- `convert-collect-forms`: Transforms local collect XLSX forms into the XML format required by the CHT.
- `convert-contact-forms`: Converts local contact XLSX forms into XML with support for place-type templating and model adjustments.
- `convert-training-forms`: Processes local training XLSX forms into XML and Enketo-compatible formats.
- `csv-to-docs`: Parses CSV files to generate JSON document files for contacts, places, and reports in the local project.

## Upload
- `upload-app-forms`: Synchronizes compiled local application forms with the CHT instance.
- `upload-app-settings`: Uploads the compiled application settings JSON to the CHT instance.
- `upload-branding`: Uploads branding configuration and associated image assets to the CHT instance.
- `upload-collect-forms`: Synchronizes compiled local collect forms with the CHT instance.
- `upload-contact-forms`: Synchronizes compiled local contact forms with the CHT instance.
- `upload-custom-translations`: Validates and uploads custom translation properties files to the CHT instance.
- `upload-database-indexes`: Configures and uploads PouchDB/CouchDB index definitions to the CHT instance to improve query performance.
- `upload-docs`: Efficiently uploads batches of local JSON documents to the CHT instance, including handling user account updates for deleted places.
- `upload-extension-libs`: Uploads custom JavaScript libraries to the CHT instance for extending application logic.
- `upload-partners`: Uploads partner-specific configuration documents and assets to the CHT instance.
- `upload-privacy-policies`: Uploads privacy policy HTML files and their respective language mappings to the CHT instance.
- `upload-resources`: Uploads resource files and their configuration to the CHT instance.
- `upload-sms-from-csv`: Parses a CSV file and uploads the contained SMS messages to the CHT instance.
- `upload-training-forms`: Synchronizes compiled local training forms with the CHT instance.

## Validate
- `validate-app-forms`: Checks the structure and content of local application forms for errors before conversion or upload.
- `validate-collect-forms`: Verifies the integrity of local collect forms against CHT requirements.
- `validate-contact-forms`: Validates local contact forms to ensure they follow the correct schema and conventions.
- `validate-training-forms`: Ensures local training forms are correctly structured and free of errors.

## Delete
- `delete-all-forms`: Removes every form currently stored on the CHT instance.
- `delete-forms`: Removes specified forms from the CHT instance based on the provided names.
- `delete-contacts`: Permanently deletes specified contacts and all their descendants from the CHT instance.

## Contacts
- `edit-contacts`: Updates existing contacts on the CHT instance using data provided in CSV files.
- `merge-contacts`: Consolidates multiple source contacts into a destination contact while moving their descendant data.
- `move-contacts`: Relocates specified contacts to a different parent location within the CHT hierarchy.

## Compression
- `compress-images`: Orchestrates the compression of all PNG and SVG assets within the project.
- `compress-pngs`: Optimizes PNG images using external compression tools to reduce file size.
- `compress-svgs`: Minimizes SVG files using SVGO to optimize them for use in the CHT.

## Project Management
- `check-for-updates`: Compares the local version of `cht-conf` with the latest available version on npm.
- `check-git`: Ensures the local repository is clean and synchronized with its upstream branch before critical operations.
- `compile-app-settings`: Aggregates modular configuration files, scripts, and rules into a single application settings file.
- `create-users`: Generates or updates user accounts on the CHT instance from a provided CSV file.
- `fetch-csvs-from-google-drive`: Downloads CSV data from specified Google Drive files into the local project.
- `fetch-forms-from-google-drive`: Retrieves XLSX forms from Google Drive and saves them locally for processing.
- `initialise-project-layout`: Sets up a new project with the standard CHT configuration directory structure and boilerplate files.
- `watch-project`: Automatically triggers validation, compilation, and upload actions whenever local project files are modified.

## AI Agent Support
- `agents-md`: Generates `AGENTS.md` and `CLAUDE.md` files in the project root to guide AI coding agents.
- `update-docs`: Fetches the latest documentation from the `medic/cht-docs` repository and stores it locally for AI agents.

## Inspection
- `inspect-errors`: Fetches and displays recent sentinel or API errors from the `medic-logs` database.
- `inspect-form`: Shows detailed information, fields, and calculations for a specific deployed form (requires `<id>` argument).
- `inspect-forms`: Lists all forms currently deployed on the CHT instance.
- `inspect-hierarchy`: Displays a simplified tree view of the top-level contact hierarchy.
- `inspect-replication`: Shows the status and progress of active CouchDB replication tasks.
- `inspect-settings-diff`: Compares local application settings (`app_settings.json`) with the settings currently deployed on the CHT instance.
- `inspect-targets`: Lists all target definitions deployed in the application settings.
- `inspect-tasks`: Lists all task definitions deployed in the application settings.
- `inspect-transitions`: Displays all configured transitions and their statuses, including any deprecation warnings.
