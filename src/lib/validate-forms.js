const { DOMParser } = require('@xmldom/xmldom');
const argsFormFilter = require('./args-form-filter');
const environment = require('./environment');
const fs = require('./sync-fs');
const log = require('./log');
const {
  getFormDir,
  getFormFilePaths
} = require('./forms-utils');

const domParser = new DOMParser();
const VALIDATIONS_PATH = fs.path.resolve(__dirname, './validation/form');
const validations = fs.readdir(VALIDATIONS_PATH)
  .filter(name => name.endsWith('.js'))
  .map(validationName => {
    const validation = require(fs.path.join(VALIDATIONS_PATH, validationName));
    validation.name = validationName;
    if(!Object.hasOwnProperty.call(validation, 'requiresInstance')) {
      validation.requiresInstance = true;
    }
    if(!Object.hasOwnProperty.call(validation, 'skipFurtherValidation')) {
      validation.skipFurtherValidation = false;
    }

    return validation;
  })
  .sort((a, b) => {
    if(a.skipFurtherValidation && !b.skipFurtherValidation) {
      return -1;
    }
    if(!a.skipFurtherValidation && b.skipFurtherValidation) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

module.exports = async (projectDir, subDirectory, options={}) => {

  const formsDir = getFormDir(projectDir, subDirectory);
  if(!formsDir) {
    log.info(`Forms dir not found: ${projectDir}/forms/${subDirectory}`);
    return;
  }

  const instanceProvided = environment.apiUrl;
  let validationSkipped = false;

  const fileNames = argsFormFilter(formsDir, '.xml', options);

  let errorFound = false;
  for(const fileName of fileNames) {
    log.info(`Validating form: ${fileName}…`);

    const { xformPath } = getFormFilePaths(formsDir, fileName);
    const xml = fs.read(xformPath);

    const valParams = { xformPath, xmlStr: xml, xmlDoc: domParser.parseFromString(xml) };
    for(const validation of validations) {
      if(validation.requiresInstance && !instanceProvided) {
        validationSkipped = true;
        continue;
      }

      const output = await validation.execute(valParams);
      if(output.warnings) {
        output.warnings.forEach(warnMsg => log.warn(warnMsg));
      }
      if(output.errors && output.errors.length) {
        output.errors.forEach(errorMsg => log.error(errorMsg));
        errorFound = true;
        if(validation.skipFurtherValidation) {
          break;
        }
      }
    }
  }

  if(validationSkipped) {
    log.warn('Some validations have been skipped because they require a CHT instance.');
  }
  if(errorFound) {
    throw new Error('One or more forms have failed validation.');
  }
};
