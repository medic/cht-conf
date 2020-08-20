const joi = require('@hapi/joi');

const FormsSchema = joi.array().items(
  joi.object({
    meta: joi.object({
      code: joi.string().required(),
      icon: joi.string(),
      translation_key: joi.string(),
      subject_key: joi.string()
    }).required(),
    fields: joi.object({
      field: joi.object({
        type: joi.string().required()
      }).required(),
      labels: joi.object({
        short: joi.string(),
        tiny: joi.string()
      }),
    }).required()
  })
);