const path = require('path');
const Joi = require('@hapi/joi');
const { error, warn } = require('./log');

const TargetSchema = Joi.array().items(
  Joi.object({
    id: Joi.string().min(1).required(),
    icon: Joi.string().min(1).optional(),
    translation_key: Joi.string().min(1).optional(),
    subtitle_translation_key: Joi.string().min(1).optional(),
    percentage_count_translation_key: Joi.string().min(1).optional(),
    context: Joi.string().optional(),

    type: Joi.string().valid('count', 'percent').required(),
    goal: Joi.number().min(-1).max(100).required(),
    appliesTo: Joi.string().valid('contacts', 'reports').required(),
    appliesToType: Joi.array().items(Joi.string()).optional(),
    appliesIf: Joi.function().optional(),
    passesIf: Joi.alternatives().conditional('type', { is: 'percent', then: Joi.function().required(), otherwise: Joi.function().forbidden() }),
    date: Joi.alternatives().try(
        Joi.string().valid('reported', 'now'),
        Joi.function(),
      ).optional(),
    emitCustom: Joi.function().optional(),
    idType: Joi.alternatives().try(
      Joi.string().valid('report', 'contact'),
      Joi.function(),
    ).optional()
  })
  .required()
)
  .unique('id')
  .required();

const EventSchema = idPresence => Joi.object({
    id: Joi.string().presence(idPresence),
    days: Joi.alternatives().conditional('dueDate', { is: Joi.exist(), then: Joi.forbidden(), otherwise: Joi.number().required() }),
    dueDate: Joi.alternatives().conditional('days', { is: Joi.exist(), then: Joi.forbidden(), otherwise: Joi.function().required() }),
    start: Joi.number().min(0).required(),
    end: Joi.number().min(0).required(),
  });

const TaskSchema = Joi.array().items(
  Joi.object({
    name: Joi.string().min(1).required(),
    icon: Joi.string().min(1).optional(),
    title: Joi.string().min(1).required(),
    appliesTo: Joi.string().valid('contacts', 'reports').required(),
    appliesIf: Joi.function().optional(),
    appliesToType: Joi.array().items(Joi.string()).optional(),
    contactLabel: Joi.alternatives().try( Joi.string().min(1), Joi.function() ).optional(),
    resolvedIf: Joi.function().required(),
    events: Joi.alternatives().conditional('events', {
      is: Joi.array().length(1),
      then: Joi.array().items(EventSchema('optional')).min(1).required(),
      otherwise: Joi.array().items(EventSchema('required')).unique('id').required(),
    }),
    actions: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('report', 'contacts').optional(),
        form: Joi.string().min(1).required(),
        label: Joi.string().min(1).optional(),
        modifyContent: Joi.function().optional(),
        priority: Joi.object({
          level: Joi.string().valid('high', 'medium').optional(),
          label: Joi.string().min(1).optional(),
        }).optional(),
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
    return `Failed to parse file ${pathToTasks}. ${err}`;
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