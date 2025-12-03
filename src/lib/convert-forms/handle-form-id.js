const { getPrimaryInstanceNode } = require('../forms-utils');

const CONTACT_SUB_DIR = 'contact';
const FORM_PREFIXES = [CONTACT_SUB_DIR, 'training'];
/*
  subDir - the name of the directory containing the form
  fileName - the name of the form file (without extension)
  formName - the base name of the form (without action suffix)
 */
const PATH_PATTERN = /^.*\/(?<subDir>[^/]+)\/(?<fileName>(?<formName>[^/]+?)(-(?<action>create|edit))?)\.xml$/;

const getPrefix = subDirectory => FORM_PREFIXES.includes(subDirectory) ? `${subDirectory}:` : '';
const getSuffix = (subDirectory, action) => {
  if (!action) {
    return '';
  }
  return `${subDirectory === CONTACT_SUB_DIR ? ':' : '-'}${action}`;
};

module.exports = {
  /**
   * Ensures the form_id in the XML matches the expected id derived from the form's file name.
   */
  handleFormId: (xmlDoc, path) => {
    const { groups: {
      subDir,
      fileName,
      formName,
      action
    } } = path.match(PATH_PATTERN);
    const idFromPath = `${getPrefix(subDir)}${formName}${getSuffix(subDir, action)}`;
    const dataNode = Array
      .from(getPrimaryInstanceNode(xmlDoc).childNodes)
      .find(node => node.nodeType === 1);
    // const dataNode = getPrimaryInstanceNode(xmlDoc).firstElementChild;
    const idFromXml = dataNode.getAttribute('id');

    if (idFromXml === idFromPath) {
      return;
    }
    // If the form_id is empty on the xlsx settings tab, pyxform will set the filename.
    // For contact/training forms, we want to update the id in the xml.
    if (idFromXml === fileName && FORM_PREFIXES.includes(subDir)) {
      dataNode.setAttribute('id', idFromPath);
      const smsPrefix = dataNode.getAttribute('prefix');
      dataNode.setAttribute('prefix', smsPrefix.replace(idFromXml, idFromPath));
      return;
    }

    throw new Error(`The file name for the form [${
      fileName
    }] does not match the form_id in the xlsx [${
      idFromXml
    }]. Rename the form xlsx/xml files to match the form_id.`);
  }
};
