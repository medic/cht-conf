const path = require('path');
const joi = require('joi');
const { error, warn } = require('../log');
const { collectConfigFiles } = require('../auto-include');

const err = (filename, message) => details => {
  const acceptedValues = details[0].local.valids
    ? ` but only ${JSON.stringify(details[0].local.valids)} are allowed`
    : '';
  return new Error(`Invalid schema at ${filename}${details[0].local.label}
${message}
Current value of ${filename}${details[0].local.label} is ${JSON.stringify(details[0].value)}${acceptedValues}
`);
};
const targetError = message => err('targets', message);
const taskError = message => err('tasks', message);

// Marks a target property as static display metadata that belongs in
// app_settings.tasks.targets.items. parse-targets derives its whitelist from
// these tags (see TARGET_METADATA_FIELDS), so the schema is the single source
// of truth and the two cannot drift. Runtime/logic properties (appliesIf,
// passesIf, groupBy, date, emitCustom, idType, appliesTo, appliesToType) are
// intentionally left untagged.
const APP_SETTINGS_META = { appSettingsTarget: true };

const DhisSchema = joi.object({
  dataSet: joi.string().min(1).max(15).optional(),
  dataElement: joi.string().min(1).max(15).required(),
})
  .unknown(true);

const TargetSchema = joi.array().items(
  joi.object({
    id: joi.string().min(1).required().meta(APP_SETTINGS_META),
    icon: joi.string().min(1).optional().meta(APP_SETTINGS_META),
    translation_key: joi.string().min(1).optional().meta(APP_SETTINGS_META),
    subtitle_translation_key: joi.string().min(1).optional().meta(APP_SETTINGS_META),
    percentage_count_translation_key: joi.string().min(1).optional().meta(APP_SETTINGS_META),
    context: joi.string().optional().meta(APP_SETTINGS_META),

    type: joi.string().valid('count', 'percent').required().meta(APP_SETTINGS_META),
    goal: joi.alternatives().conditional('type', {
      is: 'percent',
      then: joi.number().min(-1).max(100).required(),
      otherwise: joi.number().min(-1).required(),
    }).meta(APP_SETTINGS_META),
    appliesTo: joi.string().valid('contacts', 'reports').required(),
    appliesToType: joi.array().items(joi.string()).optional().min(1),
    appliesIf: joi.function().optional()
      .error(targetError('"appliesIf" should be of type function(contact, report)')),
    passesIf: joi.alternatives().conditional('groupBy', {
      is: joi.exist(),
      then: joi.function().forbidden(),
      otherwise: joi.alternatives().conditional('type', {
        is: 'percent',
        then: joi.function().required(),
        otherwise: joi.function().forbidden(),
      })
    }).error(targetError(
      '"passesIf" is required only "type=percent" and "groupBy" is not defined. Otherwise, it is forbidden.'
    )),
    groupBy: joi.function().optional()
      .error(targetError('"groupBy" should be of type function(contact, report)')),
    passesIfGroupCount: joi.alternatives().conditional('groupBy', {
      is: joi.exist(),
      then: joi.object({
        gte: joi.number().required(),
      }).required(),
      otherwise: joi.forbidden(),
    }).meta(APP_SETTINGS_META),
    date: joi.alternatives().try(
      joi.string().valid('reported', 'now'),
      joi.function(),
    )
      .optional()
      .error(targetError(
        '"date" should be either ["reported", "now"] or "function(contact, report)" returning timestamp'
      )),
    emitCustom: joi.function().optional()
      .error(targetError('"emitCustom" should be a function')),
    dhis: joi.alternatives().try(
      DhisSchema,
      joi.array().items(DhisSchema),
    )
      .optional()
      .meta(APP_SETTINGS_META),
    visible: joi.boolean().optional().meta(APP_SETTINGS_META),
    idType: joi.alternatives().try(
      joi.string().valid('report', 'contact'),
      joi.function(),
    )
      .optional()
      .error(targetError('idType should be either "report" or "contact" or "function(contact, report)"')),
    aggregate: joi.boolean().optional().meta(APP_SETTINGS_META),
    limit_count_to_goal: joi.boolean().optional().meta(APP_SETTINGS_META),
  })
)
  .unique('id')
  .required();

// Derive the static-metadata field whitelist directly from the schema's
// `appSettingsTarget` tags, so adding a tagged property to TargetSchema is the
// only step needed for it to flow into app_settings (no separate list to keep
// in sync). parse-targets consumes this via the module export.
const deriveTargetMetadataFields = (arraySchema) => {
  const { keys } = arraySchema.describe().items[0];
  return Object.keys(keys).filter(name => (keys[name].metas || []).some(meta => meta.appSettingsTarget));
};
const TARGET_METADATA_FIELDS = deriveTargetMetadataFields(TargetSchema);

const EventSchema = idPresence => joi.object({
  id: joi.string().presence(idPresence),
  days: joi.alternatives().conditional(
    'dueDate',
    { is: joi.exist(), then: joi.forbidden(), otherwise: joi.number().required() }
  ).error(taskError('"event.days" is a required integer field only when "event.dueDate" is absent')),
  dueDate: joi.alternatives().conditional(
    'days',
    { is: joi.exist(), then: joi.forbidden(), otherwise: joi.function().required() }
  ).error(taskError(
    '"event.dueDate" is required to be "function(event, contact, report)" only when "event.days" is absent'
  )),
  start: joi.number().min(0).required(),
  end: joi.number().min(0).required(),
});

const TaskSchema = joi.array().items(
  joi.object({
    name: joi.string().min(1).required(),
    icon: joi.string().min(1).optional(),
    title: joi.string().min(1).required(),
    appliesTo: joi.string().valid('contacts', 'reports', 'scheduled_tasks').required(),
    appliesIf: joi.function().optional()
      .error(taskError('"appliesIf" should be of type function(contact, report)')),
    appliesToType: joi.array().items(joi.string()).optional().min(1),
    contactLabel:
      joi.alternatives().try( joi.string().min(1), joi.function() ).optional()
        .error(taskError('"contactLabel" should either be a non-empty string or function(contact, report)')),
    resolvedIf: joi
      .alternatives()
      .conditional('actions', {
        is: joi.array().has(joi.object({ type: 'report' }).unknown()),
        then: joi.function().optional(),
        otherwise: joi.function().required()
      })
      .error(taskError(
        'ERROR: Schema error in actions array: Actions with property "type" which value is different than "report", ' +
        'should define property "resolvedIf" as: function(contact, report) { ... }.'
      )),
    events: joi.alternatives().conditional('events', {
      is: joi.array().length(1),
      then: joi.array().items(EventSchema('optional')).min(1).required(),
      otherwise: joi.array().items(EventSchema('required')).unique('id').required(),
    }),
    priority: joi.alternatives().try(
      joi.object({
        level: joi.string().valid('high', 'medium').optional(),
        label: joi.string().min(1).optional(),
      }),
      joi.function(),
    )
      .optional()
      .error(taskError(
        '"priority" should be an object with optional fields "level" and "label" or a function which returns the same'
      )),
    actions: joi.array().items(
      joi.object({
        type: joi.string().valid('report', 'contact').optional(),
        form: joi
          .alternatives()
          .conditional(
            'type',
            { is: 'contact', then: joi.forbidden(), otherwise: joi.string().min(1).required() }
          ),
        label: joi.string().min(1).optional(),
        modifyContent: joi.function().optional()
          .error(taskError('"actions.modifyContent" should be "function (content, contact, report)')),
      })
    )
      .min(1)
      .required(),
  })
)
  .unique('name')
  .required();

const validateFile = (logEvent, filePath, displayName, schema) => {
  let fileContent;
  try {
    fileContent = require(filePath);
  } catch (err) {
    logEvent(`Failed to parse file ${filePath}. ${err}`);
    return { valid: false };
  }

  const errors = validate(displayName, fileContent, schema);
  if (errors.length) {
    logEvent(`${displayName} invalid schema:`);
    errors.forEach(err => logEvent(err));
  }
  return { valid: errors.length === 0, content: fileContent };
};

const findDuplicates = (items, key) => {
  const seen = new Set();
  const duplicates = new Set();
  items.forEach(item => {
    if (item && typeof item === 'object' && key in item) {
      const value = item[key];
      if (seen.has(value)) {
        duplicates.add(value);
      } else {
        seen.add(value);
      }
    }
  });
  return [...duplicates];
};

// Validates every file (no short-circuit, so all schema errors surface) and then
// checks that `uniqueKey` is unique across the combined set, since the directory
// files are concatenated at compile time and per-file joi `.unique()` cannot catch
// duplicates spanning multiple files.
const validateFiles = (logEvent, files, schema, uniqueKey) => {
  let valid = true;
  const allItems = [];

  files.forEach(filePath => {
    const { valid: fileValid, content } = validateFile(logEvent, filePath, path.basename(filePath), schema);
    if (!fileValid) {
      valid = false;
    }
    if (Array.isArray(content)) {
      allItems.push(...content);
    }
  });

  const duplicates = findDuplicates(allItems, uniqueKey);
  if (duplicates.length) {
    logEvent(`Duplicate "${uniqueKey}" value(s) found across files: ${duplicates.join(', ')}`);
    valid = false;
  }

  return valid;
};

const validate = (filename, fileContent, schema) => {
  const result = schema.validate(fileContent, { abortEarly: false });
  if (!result.error) {
    return [];
  }

  if (!result.error.details) {
    return [result.error.message];
  }

  return result.error.details.map(detail => formatJoiError(filename, detail));
};

const formatJoiError = (desc, detail) => {
  const { context } = detail;
  if (detail.type === 'array.unique') {
    const fieldValue = context.value[context.path];
    return `${desc}${context.label} contains duplicate value for the "${context.path}" field: "${fieldValue}"`;
  }

  let result = detail.message;
  if (context.value) {
    result += `. Value is: "${context.value}"`;
  }
  return result;
};

module.exports = (projectDir, errorOnValidation) => {
  const logEvent = errorOnValidation ? error : warn;

  const taskFiles = collectConfigFiles(projectDir, { baseFilename: 'tasks.js', subdir: 'tasks' });
  const targetFiles = collectConfigFiles(projectDir, { baseFilename: 'targets.js', subdir: 'targets' });

  const tasksValid = validateFiles(logEvent, taskFiles, TaskSchema, 'name');
  const targetsValid = validateFiles(logEvent, targetFiles, TargetSchema, 'id');

  const success = tasksValid && targetsValid;
  if (errorOnValidation && !success) {
    throw Error('Declarative configuration schema validation errors');
  }
};

// Whitelist of target properties that are copied verbatim into
// app_settings.tasks.targets.items, derived from the schema (see above).
module.exports.TARGET_METADATA_FIELDS = TARGET_METADATA_FIELDS;
