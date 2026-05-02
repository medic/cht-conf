# CHT Project Directory Structure

A standard CHT configuration project managed by `cht-conf` follows this directory structure. AI agents must strictly adhere to these locations when creating or modifying files.

## Root Directory Files

- `app_settings.json`: (Optional) The complete application settings. Often split into the `app_settings/` directory.
- `contact-summary.templated.js`: Defines the fields and cards shown in the contact summary.
- `targets.js`: Defines the analytics targets shown in the app.
- `tasks.js`: Defines the tasks shown to users.
- `rules.nools`: (Optional) Custom Nools rules for tasks and targets (older projects).
- `privacy-policies.json`: Configuration for privacy policies.
- `resources.json`: Configuration for branding and resources.

## Directories

### `forms/`
Contains all XLSForm files and their companion properties. **Crucial: Do not mix form types.**

- `forms/app/`: User-facing forms (e.g., assessments, follow-ups).
- `forms/contact/`: Forms for creating/editing places and people (e.g., `person-create.xlsx`, `clinic-edit.xlsx`).
- `forms/collect/`: (Legacy) Forms for ODK Collect.
- `forms/training/`: Forms used in training mode.

### `app_settings/`
Instead of one giant `app_settings.json`, settings can be split here:
- `app_settings/base_settings.json`: General settings.
- `app_settings/forms.json`: Form-specific settings.
- `app_settings/schedules.json`: Task schedule definitions.

### `resources/`
Contains images and other assets for branding (e.g., `logo.png`).

### `translations/`
Contains `.properties` files for multilingual support (e.g., `messages-en.properties`).

### `test/`
Contains test files for forms, tasks, and targets.

## Form Companion Files
Every `.xlsx` form may have a companion `.properties.json` file with the same base name.
Example: `forms/app/assessment.xlsx` -> `forms/app/assessment.properties.json`
- `context`: (Optional) Restricts form visibility to specific contact types or conditions.
- `hidden_fields`: (Optional) List of fields to be hidden from the UI but kept in the doc.
