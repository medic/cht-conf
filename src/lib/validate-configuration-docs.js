const joi = require('joi');

// Structure expected by cht-core (api/src/services/branding.js, admin images-branding controller):
// `title` is required and `resources` maps a fixed set of keys to attachment names.
const BrandingSchema = joi.object({
  title: joi.string().min(1).required(),
  resources: joi.object({
    logo: joi.string().min(1),
    favicon: joi.string().min(1),
    icon: joi.string().min(1),
  }),
});

// Structure expected by cht-core (admin images-partners controller, about page):
// `resources` maps a partner name to an attachment name.
const PartnersSchema = joi.object({
  resources: joi.object()
    .pattern(joi.string().min(1), joi.string().min(1))
    .required(),
});

const validateSchema = (schema, config) => {
  const { error } = schema.validate(config, { abortEarly: false });
  return error ? error.details.map(detail => detail.message) : [];
};

// Every `resources` value must reference a file that exists in the attachments directory,
// otherwise cht-core will look up an attachment that was never uploaded.
const findMissingAttachments = (config, attachments) => {
  const resources = config?.resources;
  if (!resources || typeof resources !== 'object') {
    return [];
  }
  return Object
    .entries(resources)
    .filter(([, fileName]) => !attachments?.[fileName])
    .map(([key, fileName]) => `"resources.${key}" references "${fileName}" but no such file was found`);
};

const validate = (schema, config, attachments) => {
  const errors = validateSchema(schema, config);
  if (!errors.length) {
    errors.push(...findMissingAttachments(config, attachments));
  }
  return errors.length ? { valid: false, error: errors.join('; ') } : { valid: true };
};

module.exports = {
  /**
   * @param {object} config content of branding.json
   * @param {object} attachments attachments built from the branding/ directory (file name -> attachment)
   * @return {{valid: boolean, error?: string}}
   */
  validateBranding: (config, attachments) => validate(BrandingSchema, config, attachments),

  /**
   * @param {object} config content of partners.json
   * @param {object} attachments attachments built from the partners/ directory (file name -> attachment)
   * @return {{valid: boolean, error?: string}}
   */
  validatePartners: (config, attachments) => validate(PartnersSchema, config, attachments),
};
