module.exports = {
  AGENTS_MD: `# CHT Project AI Agent Guide

This project is a CHT (Community Health Toolkit) configuration project.

## Silent failures — things that compile but do nothing

### Wrong form directory → upload silently skips
Forms must live in exactly \`forms/app/\`, \`forms/contact/\`, \`forms/training/\`, or \`forms/collect/\`.
If the directory doesn't exist or is misspelled (e.g. \`forms/app-forms/\`, \`forms/contacts/\`),
\`cht upload-app-forms\` runs without error but uploads nothing.
Always verify the directory name exactly before creating forms.

### Contact forms must be named \`*-create.xlsx\` or \`*-edit.xlsx\`
A file like \`forms/contact/person.xlsx\` converts without error but will fail on upload because
the form ID in the XML must match the filename pattern \`contact:person-create\` or \`contact:person-edit\`.
The suffix determines the action type; omitting it produces an ID mismatch error on upload.

### \`.properties.json\` — only these fields are read
The following fields are the only ones with effect: \`context\`, \`icon\`, \`title\`,
\`xml2sms\`, \`subject_key\`, \`hidden_fields\`, and (contact forms only) \`duplicate_check\`.
Any other field is silently ignored. The deprecated \`internalId\` field throws an error
if it doesn't match the filename; remove it if present.

---

## tasks.js / targets.js schema gotchas

### tasks.js and targets.js must both exist at project root
These files must live at the project root, not in \`app_settings/\`.
If only one is present, \`compile-app-settings\` fails. If \`rules.nools.js\` also exists,
compilation fails because the legacy and declarative styles are mutually exclusive.

### Multiple task events require unique \`id\` fields
A single-event task may omit the event \`id\`. As soon as a task has two or more events,
every event must have a unique \`id\` string — the schema enforces this conditionally
and the error only surfaces at compile time.

### \`event.days\` and \`event.dueDate\` are mutually exclusive
Each task event uses either \`days: <integer>\` (relative due date) or
\`dueDate: function(event, contact, report)\` (computed due date), never both, never neither.
Including both produces a schema error; omitting both also fails validation.

### \`resolvedIf\` is required when all actions have \`type: 'contact'\`
If every action in a task has \`type: 'contact'\`, the \`resolvedIf\` field is required.
If any action has \`type: 'report'\` (or no type), \`resolvedIf\` becomes optional.
A task that opens a contact creation form without \`resolvedIf\` will fail validation.

### Percent targets require \`passesIf\`; \`groupBy\` forbids it
- \`type: 'percent'\` without \`groupBy\`: \`passesIf\` is required.
- Any target with \`groupBy\` defined: \`passesIf\` is forbidden.
Including \`passesIf\` alongside \`groupBy\`, or omitting it from a percent target, both fail validation.

### Task and target names must be unique
Duplicate \`name\` values across tasks, or duplicate \`id\` values across targets,
fail schema validation at compile time with a "contains duplicate value" error.

---

## Runtime behaviour that produces no compile error

### \`appliesToType\` for reports matches the form name, not the contact type
When \`appliesTo: 'reports'\`, \`appliesToType\` is compared against \`report.form\`
(the XLSForm file name without extension), not the contact type. A task with
\`appliesTo: 'reports', appliesToType: ['person']\` won't fire on reports submitted
by people of type \`person\`; it fires on reports whose form ID is \`"person"\`.

### Contact type resolution uses two fields
A contact's type is resolved as: if \`contact.type === 'contact'\`, use \`contact.contact_type\`;
otherwise use \`contact.type\`. A task with \`appliesToType: ['chw']\` will match contacts
where \`type='contact', contact_type='chw'\` but not where \`type='chw'\` unless it also
falls through the other branch. Keep this in mind when writing \`appliesIf\` predicates.

### \`appliesIf\` for \`scheduled_tasks\` receives a third argument
When \`appliesTo: 'scheduled_tasks'\`, \`appliesIf(contact, report, scheduledTaskIndex)\`
receives the index of the scheduled task within the report. For all other \`appliesTo\`
values it receives only two arguments. Copying a task definition and changing \`appliesTo\`
without updating \`appliesIf\`'s signature produces silent logic errors.
`,
  CLAUDE_MD: `# Claude Instructions for CHT Project

You are an AI agent helping with a CHT (Community Health Toolkit) configuration project.

## Critical: things that fail silently

- **Wrong form directory**: \`cht upload-app-forms\` exits 0 and uploads nothing if \`forms/app/\`
  doesn't exist. Use exactly \`forms/app/\`, \`forms/contact/\`, \`forms/training/\`, \`forms/collect/\`.
- **Contact form naming**: files in \`forms/contact/\` must end in \`-create.xlsx\` or \`-edit.xlsx\`.
  Any other name converts fine but fails on upload with an ID mismatch.
- **Extra fields in \`.properties.json\`** are silently ignored. Only \`context\`, \`icon\`, \`title\`,
  \`xml2sms\`, \`subject_key\`, \`hidden_fields\`, and (contact only) \`duplicate_check\` take effect.

## tasks.js / targets.js rules

- Both \`tasks.js\` and \`targets.js\` must exist at the project root when using declarative config.
  Having one without the other, or having \`rules.nools.js\` alongside either, causes compile failure.
- Two or more task events → each event must have a unique \`id\` field.
- Each event uses either \`days: <int>\` or \`dueDate: fn\`, never both and never neither.
- When all task actions have \`type: 'contact'\`, \`resolvedIf\` is required.
- \`type: 'percent'\` targets require \`passesIf\` (unless \`groupBy\` is set, which forbids it).
- Task \`name\` and target \`id\` values must be unique across their respective arrays.

## Runtime gotchas (no compile error)

- \`appliesToType\` when \`appliesTo: 'reports'\` matches the **form name** (\`report.form\`),
  not the submitter's contact type.
- Contact type = \`contact.contact_type\` when \`contact.type === 'contact'\`, else \`contact.type\`.
- \`appliesIf\` for \`appliesTo: 'scheduled_tasks'\` receives a third \`scheduledTaskIndex\` argument.
`
};
