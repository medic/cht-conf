const argsFormFilter = require('./args-form-filter');
const fs = require('./sync-fs');
const log = require('./log');
const {
  getFormDir,
  getFormFilePaths
} = require('./forms-utils');

const instanceIdValidation = require('./validation/form/has-instance-id');
const xformGenerationValidation = require('./validation/form/can-generate-xform');

module.exports = async (projectDir, subDirectory, options={}) => {

  const formsDir = getFormDir(projectDir, subDirectory);
  if(!formsDir) {
    log.info(`Forms dir not found: ${formsDir}`);
    return;
  }

  const idValidationsPassed = { errors: [], warnings: [] };
  const validateFormsPassed = { errors: [], warnings: [] };

  const fileNames = argsFormFilter(formsDir, '.xml', options);
  for (const fileName of fileNames) {
    log.info(`Validating form: ${fileName}…`);

    const { xformPath } = getFormFilePaths(formsDir, fileName); //filePath
    const xml = fs.read(xformPath);

    const localIdValidationsPassed = await instanceIdValidation.execute({ xformPath, xmlStr: xml });
    idValidationsPassed.errors.push(...(localIdValidationsPassed.errors || []));
    idValidationsPassed.warnings.push(...(localIdValidationsPassed.warnings || []));
    const localValidateFormsPassed = await xformGenerationValidation.execute({ xformPath, xmlStr: xml });
    validateFormsPassed.errors.push(...(localValidateFormsPassed.errors || []));
    validateFormsPassed.warnings.push(...(localValidateFormsPassed.warnings || []));
  }
  // Once all the fails were checked raise an exception if there were errors
  let errors = [];
  if (validateFormsPassed.errors.length) {
    validateFormsPassed.errors.forEach(errorMsg => log.error(errorMsg));
    errors.push('One or more forms appears to have errors found by the API validation endpoint.');
  }
  if (idValidationsPassed.errors.length) {
    idValidationsPassed.errors.forEach(errorMsg => log.error(errorMsg));
    errors.push('One or more forms appears to be missing <meta><instanceID/></meta> node.');
  }
  if (errors.length) {
    // the blank spaces are a trick to align the errors in the log ;)
    throw new Error(errors.join('\n             '));
  }
};
