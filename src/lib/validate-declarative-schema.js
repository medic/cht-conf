const path = require('path');
const joi = require('@hapi/joi');
const { error, warn } = require('./log');

const TargetSchema = joi.array().items(
  joi.object({
    id: joi.string().min(1).required(),
    icon: joi.string().min(1).optional(),
    translation_key: joi.string().min(1).optional(),
    subtitle_translation_key: joi.string().min(1).optional(),
    percentage_count_translation_key: joi.string().min(1).optional(),
    context: joi.string().optional(),

    type: joi.string().valid('count', 'percent').required(),
    goal: joi.number().min(-1).max(100).required(),
    appliesTo: joi.string().valid('contacts', 'reports').required(),
    appliesToType: joi.array().items(joi.string()).optional(),
    appliesIf: joi.function().optional(),
    passesIf: joi.alternatives().conditional('type', { is: 'percent', then: joi.function().required(), otherwise: joi.function().forbidden() }),
    date: joi.alternatives().try(
        joi.string().valid('reported', 'now'),
        joi.function(),
      ).optional(),
    emitCustom: joi.function().optional(),
    idType: joi.alternatives().try(
      joi.string().valid('report', 'contact'),
      joi.function(),
    ).optional()
  })
  .required()
)
  .unique('id')
  .required();

const EventSchema = idPresence => joi.object({
    id: joi.string().presence(idPresence),
    days: joi.alternatives().conditional('dueDate', { is: joi.exist(), then: joi.forbidden(), otherwise: joi.number().required() }),
    dueDate: joi.alternatives().conditional('days', { is: joi.exist(), then: joi.forbidden(), otherwise: joi.function().required() }),
    start: joi.number().min(0).required(),
    end: joi.number().min(0).required(),
  });

const TaskSchema = joi.array().items(
  joi.object({
    name: joi.string().min(1).required(),
    icon: joi.string().min(1).optional(),
    title: joi.string().min(1).required(),
    appliesTo: joi.string().valid('contacts', 'reports', 'scheduled_tasks').required(),
    appliesIf: joi.function().optional(),
    appliesToType: joi.array().items(joi.string()).optional(),
    contactLabel: joi.alternatives().try( joi.string().min(1), joi.function() ).optional(),
    resolvedIf: joi.function().required(),
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
    ).optional(),
    actions: joi.array().items(
      joi.object({
        type: joi.string().valid('report', 'contacts').optional(),
        form: joi.string().min(1).required(),
        label: joi.string().min(1).optional(),
        modifyContent: joi.function().optional(),
      })
    )
      .min(1)
      .required(),
  })
)
  .unique('name')
  .required();

const validate = (logEvent, projectDir, filename, schema) => {
  const pathToTasks = path.join(projectDir, filename);
  let tasks;
  try {
    tasks = require(pathToTasks);
  } catch (err) {
    logEvent(`Failed to parse file ${pathToTasks}. ${err}`);
    return false;
  }

  const result = schema.validate(tasks, { abortEarly: false });
  if (result.error) {
    const { message } = result.error;
    logEvent(`${filename} invalid schema: ${message}`);
  }
  
  return !result.error;
};

module.exports = (projectDir, errorOnValidation) => {
  const logEvent = errorOnValidation ? error : warn;
  const tasksValid = validate(logEvent, projectDir, 'tasks.js', TaskSchema);
  const targetsValid = validate(logEvent, projectDir, 'targets.js', TargetSchema);

  const success = tasksValid && targetsValid;
  if (errorOnValidation && !success) {
    throw Error('Declarative configuration schema validation errors');
  }
};