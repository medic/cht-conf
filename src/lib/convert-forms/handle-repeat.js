const { getNode, getNodes, removeNode, XPATH_MODEL, XPATH_BODY, SIMPLE_XPATH_PATTERN } = require('../forms-utils');

const repeatCountPath = (nodeset) => `${nodeset}_count`;

const repeatBodyNodeNeedsCountField = (bodyNode) => {
  const nodeset = bodyNode
    .getAttribute('nodeset')
    .trim();
  const jrCount = bodyNode
    .getAttribute('jr:count')
    .trim();
  return nodeset && jrCount && jrCount !== repeatCountPath(nodeset) && SIMPLE_XPATH_PATTERN.test(jrCount);
};

const repeatCountDoesNotExist = (xmlDoc) => (bodyNode) => {
  const path = repeatCountPath(bodyNode.getAttribute('nodeset'));
  const existingField = getNode(xmlDoc, `${XPATH_MODEL}/instance${path}`);
  return !existingField;
};

const addRepeatCountToInstance = (xmlDoc) => (bodyNode) => {
  const path = repeatCountPath(bodyNode.getAttribute('nodeset'));
  const pathSegments = path.split('/');
  const fieldName = pathSegments.pop();
  const parentPath = pathSegments.join('/');
  const parentNode = getNode(xmlDoc, `${XPATH_MODEL}/instance${parentPath}`);
  if (!parentNode) {
    return false;
  }
  const newFieldNode = xmlDoc.createElement(fieldName);
  parentNode.appendChild(newFieldNode);
  return true;
};

const addRepeatCountBind = (xmlDoc) => (bodyNode) => {
  const nodeset = repeatCountPath(bodyNode.getAttribute('nodeset'));
  const bindNode = xmlDoc.createElement('bind');
  bindNode.setAttribute('nodeset', nodeset);
  bindNode.setAttribute('type', 'string');
  bindNode.setAttribute('readonly', 'true()');
  bindNode.setAttribute('calculate', bodyNode.getAttribute('jr:count'));
  const modelNode = getNode(xmlDoc, XPATH_MODEL);
  modelNode.appendChild(bindNode);
  return bodyNode;
};

const updateJrCount = (bodyNode) => {
  const jrCount = repeatCountPath(bodyNode.getAttribute('nodeset'));
  bodyNode.setAttribute('jr:count', jrCount);
  return bodyNode;
};

module.exports = {
  /**
   * Pyxform now will not always generate a `${repeat_name}_count` field for repeats with a dynamic repeat_count.
   * When the repeat_count is a simple reference to another field Pyxform omits generating the `${repeat_name}_count`
   * field and instead just directly references the other field in the jr:count attribute of the repeat in the body.
   * Unfortunately, this can cause buggy behavior in Enketo. So, to ensure consistent behavior, we add the
   * `${repeat_name}_count` field back into the instance model and update the jr:count attribute to reference it.   *
   * https://github.com/XLSForm/pyxform/issues/576
   */
  addRepeatCount: (xmlDoc) => {
    getNodes(xmlDoc, `${XPATH_BODY}//repeat[@jr:count]`)
      .filter(repeatBodyNodeNeedsCountField)
      .filter(repeatCountDoesNotExist(xmlDoc))
      .filter(addRepeatCountToInstance(xmlDoc))
      .map(addRepeatCountBind(xmlDoc))
      .forEach(updateJrCount);
  },

  /**
   * Pyxform now inserts an initial entry into repeats directly in the instance model even when there is no
   * repeat count. This causes the form to load with an entry already present in the repeat (as if the user already
   * clicked the `+` button to add one). To maintain previous behavior, we remove this initial entry.
   * https://github.com/XLSForm/pyxform/issues/182
   */
  removeExtraRepeatInstance: (xmlDoc) => {
    getNodes(xmlDoc, `${XPATH_MODEL}/instance//*[@jr:template=""]`)
      .map(({ parentNode, nodeName }) => getNode(parentNode, `./${nodeName}[not(@jr:template="")]`))
      .filter(Boolean)
      .forEach(removeNode);
  }
};
