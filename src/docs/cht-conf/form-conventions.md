# CHT Form Conventions

CHT forms use XLSForm (Excel) files. However, there are several CHT-specific conventions that AI agents must follow to ensure forms work correctly with `cht-conf` and the CHT core.

## 1. db-doc References
CHT supports referencing documents (like people or places) directly in forms.
- `db-doc:<type>`: In the `type` column, use `db-doc:person` or `db-doc:place` to create a selection field for contacts.

## 2. xml-external Itemsets
For large lists (like a list of all villages), CHT uses external XML files.
- Use the `xml-external` pattern in the `type` column.

## 3. NO_LABEL Placeholder
(Deprecated, but still used in older forms)
- If a field should not have a label, some forms use `NO_LABEL`.
- **Better approach**: For groups, labels are not required. For hidden fields, use `hidden` or `calculate` types.

## 4. Contact Summary Data
Forms can access data from the contact summary of the subject.
- Use `instance('contact-summary')/contact/some_field` in calculations.

## 5. Metadata and Inputs
All CHT forms automatically get a `meta` section and an `inputs` section during conversion by `cht-conf`.
- Do not manually define `inputs/meta/location` in the XLSForm unless specifically required; `cht-conf` will inject it.

## 6. Form IDs and Names
- **Contact Forms**: Must end in `-create` or `-edit` (e.g., `person-create`, `clinic-edit`).
- **File Names**: The `.xlsx` filename determines the internal form ID. Avoid spaces and special characters.

## 7. Media Files
- Images, audio, and video for forms should be placed in a directory named `<form-name>-media/` next to the `.xlsx` file.
- Example: `forms/app/assessment-media/image.png` for `forms/app/assessment.xlsx`.

## 8. Hidden Fields
To hide a field from the user but keep it in the submitted document:
- Use the `hidden` appearance in the XLSForm.
- OR list the field in the `hidden_fields` array in the companion `.properties.json` file.
