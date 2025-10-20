const { getNodes, XPATH_MODEL, XPATH_BODY, getNode } = require('../forms-utils');

const removeXmlNode = node => node.parentNode.removeChild(node);

const getDynamicDefaultNode = (xmlDoc) => (ref) => {
  return getNode(
    xmlDoc,
    `${XPATH_MODEL}/setvalue[@ref='${ref}' and string-length(@value) > 0]`
  );
};

const moveDynamicDefaultValueToInstance = (xmlDoc) => (setValueNode) => {
  const ref = setValueNode
    .getAttribute('ref')
    .substring(1);
  const instanceNode = getNode(xmlDoc, `${XPATH_MODEL}/instance[1]/${ref}`);
  if (!instanceNode) {
    return;
  }

  instanceNode.textContent = setValueNode.getAttribute('value');
  removeXmlNode(setValueNode);
};

module.exports = {
  /**
   * When setting a base64 image string as a default value in a form, pyxform thinks it is "dynamic". This causes the
   * value to not be displayed properly. So, in cases were a default value is being used for a display-base64-image
   * field, this function will move the default value into the instance node where it will be treated as a static value.
   * https://github.com/XLSForm/pyxform/issues/495
   */
  replaceBase64ImageDynamicDefaults: (xmlDoc) => {
    getNodes(xmlDoc, `${XPATH_BODY}//input[contains(@appearance, 'display-base64-image')]`)
      .map(node => node.getAttribute('ref'))
      .map(getDynamicDefaultNode(xmlDoc))
      .filter(Boolean)
      .forEach(moveDynamicDefaultValueToInstance(xmlDoc));
  }
};
