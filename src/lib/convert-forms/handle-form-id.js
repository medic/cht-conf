const { getPrimaryInstanceNode } = require('../forms-utils');

const CONTACT_SUB_DIR = 'contact';
const FORM_PREFIXES = new Set([CONTACT_SUB_DIR, 'training']);
/*
  subDir - the name of the directory containing the form
  fileName - the name of the form file (without extension)
  formName - the base name of the form (without action suffix)
 */
const PATH_PATTERN = /^.*\/(?<subDir>[^/]+)\/(?<fileName>(?<formName>[^/]+?)(-(?<action>create|edit))?)\.xml$/;

const getPrefix = subDirectory => FORM_PREFIXES.has(subDirectory) ? `${subDirectory}:` : '';
const getSuffix = (subDirectory, action) => {
  if (!action) {
    return '';
  }
  return `${subDirectory === CONTACT_SUB_DIR ? ':' : '-'}${action}`;
};

module.exports = {
  /**
   * Ensures the form_id in the XML matches the expected id derived from the form's file name. If the xml for a
   * contact/training form has an id that matches the file name but does not have the `contact:` or `training:`
   * prefix, it updates the id to the expected format. Throws an error if there is a mismatch that cannot be resolved.
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
    const idFromXml = dataNode.getAttribute('id');

    if (idFromXml === idFromPath || idFromXml === idFromPath.replace(formName, 'PLACE_TYPE')) {
      // We already have the correct id
      return;
    }
    // If the form_id is empty on the xlsx settings tab, pyxform will set the filename.
    // For contact/training forms, we want to update the default id to match the proper format.
    if (idFromXml === fileName && FORM_PREFIXES.has(subDir)) {
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
