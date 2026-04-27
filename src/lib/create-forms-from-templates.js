const fs = require('./sync-fs');
const { warn } = require('./log');
const Joi = require('joi');

const FORM_EXT = '.xlsx';
const FORM_CREATE_SFX = '-create';
const FORM_EDIT_SFX = '-edit';
const FORM_OG_TEMPLATE_DEFAULT_KEY = 'PLACE_TYPE';
const PROPERTIES_EXT = '.json';
const PROPERTIES_PLACE_TYPES_KEY = 'place-types';
const PROPERTIES_CONTACT_TYPES_KEY = 'contact-types';

const DEFAULT_TEMPLATES = [
  `${FORM_OG_TEMPLATE_DEFAULT_KEY}${FORM_CREATE_SFX}${FORM_EXT}`,
  `${FORM_OG_TEMPLATE_DEFAULT_KEY}${FORM_EDIT_SFX}${FORM_EXT}`,
];

const contactTypesSchema = Joi.object().pattern(
  Joi.string(), 
  Joi.object({
    name: Joi.string().required(),
    // The "\\" is used to escape the "." in the "FORM_EXT", as in regex that means any character
    templateCreate: Joi.string().required().pattern(new RegExp(`.+${FORM_CREATE_SFX}\\${FORM_EXT}$`)),
    templateEdit: Joi.string().optional().pattern(new RegExp(`.+${FORM_EDIT_SFX}\\${FORM_EXT}$`))
  })
);

const getPropertiesFileName = (key) => `${key}${PROPERTIES_EXT}`;

const readTemplateTypesJson = (dir, fileName) => {
  const file = `${dir}/${fileName}`;

  if(!fs.exists(file)){
    return null;
  }

  try {
    return fs.readJson(file);
  }
  catch(e){
    throw new Error(`Unable to read "${file}" json file contents: ${e.message}`);
  }
};

function writeXlsxFile(dir, sourceFileName, destFileName){
  try{
    fs.copy(`${dir}/${sourceFileName}`, `${dir}/${destFileName}`, { overwrite: false });
  }
  catch(e){
    throw new Error(`Unable to write "${destFileName}" to disk: ${e.message}`);
  }
}

const getFormFileName = (name, suffix) =>  `${name}${suffix}${FORM_EXT}`;

function processPlaceConfig(dir, json){
  if (!json) {
    return;
  }
  
  Object.keys(json).forEach(type => {
    writeXlsxFile(
      dir,
      getFormFileName(FORM_OG_TEMPLATE_DEFAULT_KEY, FORM_CREATE_SFX),
      getFormFileName(type, FORM_CREATE_SFX)
    );
    writeXlsxFile(
      dir,
      getFormFileName(FORM_OG_TEMPLATE_DEFAULT_KEY, FORM_EDIT_SFX),
      getFormFileName(type, FORM_EDIT_SFX)
    );
  });
} 

function ensureValidContactSchema(json) {
  const { error } = contactTypesSchema.validate(json, { abortEarly: false });

  if(!error){
    return;
  }

  throw new Error(
    'contact_types.json config does not have the required structure: \n' +
    error.details.flatMap(({message}) =>  message).join('\n')
  );
}

function processContactConfig(dir, json){
  if (!json) {
    return;
  }

  ensureValidContactSchema(json);

  const arr = [];
  Object.entries(json).forEach(([key, value]) => {
    const { templateCreate, templateEdit } = value;
    writeXlsxFile(
      dir,
      templateCreate,
      getFormFileName(key, FORM_CREATE_SFX)
    );
    arr.push(templateCreate);
    if(templateEdit){
      writeXlsxFile(
        dir,
        templateEdit,
        getFormFileName(key, FORM_EDIT_SFX)
      );
      arr.push(templateEdit);
    }
  });
  return arr;
} 

function createFormsFromTemplates(pathToProject, subDirectory){
  const dir = `${pathToProject}/${subDirectory}`;
  const placeTypeConfig = readTemplateTypesJson(dir, getPropertiesFileName(PROPERTIES_PLACE_TYPES_KEY));
  const contactTypeConfig = readTemplateTypesJson(dir, getPropertiesFileName(PROPERTIES_CONTACT_TYPES_KEY));
  // Is there a need to support app form templates?

  let config;
  let templateFileNames = new Set(DEFAULT_TEMPLATES);
  if(placeTypeConfig && contactTypeConfig){
    throw new Error('Can not have both place-types.json AND contact-types.json template config');
  }
  else if(contactTypeConfig){
    templateFileNames = new Set(processContactConfig(dir, contactTypeConfig));
    config = contactTypeConfig;
  }
  else if(placeTypeConfig){
    warn('[DEPRECATED] The use of "place-types.json" is deprecated. Please use "contact-types.json" instead. ' +
    'This new format provides greater flexibility for template configuration, including support for: ' +
    'person templates, multiple templates per place or person, and conditional edit form creation.');
    processPlaceConfig(dir, placeTypeConfig);
    config = placeTypeConfig;
  }
  return { config, templateFileNames };
}

module.exports = {
  createFormsFromTemplates
};
