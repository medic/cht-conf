const { XPATH_MODEL, getNodes } = require('../../forms-utils');

// Enketo (and so the CHT) does not support CSV external datasets. Forms referencing them load without
// any error, but no data is available for the select_one_from_file/select_many_from_file questions.
const CSV_SRC_PREFIX = 'jr://file-csv/';

module.exports = {
  requiresInstance: false,
  skipFurtherValidation: false,
  execute: async({ xformPath, xmlDoc }) => {
    const errors = [];

    const csvSources = getNodes(xmlDoc, `${XPATH_MODEL}/instance[@src]`)
      .map(instance => instance.getAttribute('src').trim())
      .filter(src => src.startsWith(CSV_SRC_PREFIX));
    if (csvSources.length) {
      errors.push(
        `Form at ${xformPath} contains the following external data sources referencing CSV files: `
        + `[${csvSources.join(', ')}]. The CHT only supports XML files for `
        + `select_one_from_file/select_many_from_file questions. Convert the data to XML and reference it as `
        + `'jr://file/<name>.xml': `
        + `https://docs.communityhealthtoolkit.org/building/forms/app/#select-choice-from-file`
      );
    }
    return { errors, warnings: [] };
  }
};
