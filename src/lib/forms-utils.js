const fs = require('./sync-fs');

module.exports = {
  /**
   * @returns {string|null} Get the full path of the form, or
   *          null if the path doesn't exist
   */
  getFormDir: (projectDir, subDirectory) => {
    const formsDir = `${projectDir}/forms/${subDirectory}`;
    if(fs.exists(formsDir)) {
      return formsDir;
    }
    return null;
  },

  /**
   * Get paths related with the form.
   * @param {string} formsDir the full path of the form directory
   * @param {string} fileName the file name, eg. user_create.xml
   * @returns {{mediaDir: string, xformPath: string, baseFileName: string, filePath: string}}
   */
  getFormFilePaths: (formsDir, fileName) => {
    const baseFileName = fs.withoutExtension(fileName);
    return {
      baseFileName,
      mediaDir: `${formsDir}/${baseFileName}-media`,
      xformPath: `${formsDir}/${baseFileName}.xml`,
      filePath: `${formsDir}/${fileName}`
    };
  }
};
