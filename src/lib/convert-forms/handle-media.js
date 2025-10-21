const { getNodes, XPATH_MODEL, XPATH_BODY, getNode, getInstanceNode } = require('../forms-utils');

const removeXmlNode = node => node.parentNode.removeChild(node);

const getDynamicDefaultNode = (xmlDoc) => (ref) => {
  return getNode(
    xmlDoc,
    `${XPATH_MODEL}/setvalue[@ref='${ref}' and string-length(@value) > 0 and @event="odk-instance-first-load"]`
  );
};

const moveDynamicDefaultValueToInstance = (xmlDoc) => (setValueNode) => {
  const ref = setValueNode.getAttribute('ref');
  const instanceNode = getNode(xmlDoc, `${XPATH_MODEL}/instance[1]${ref}`);
  if (!instanceNode) {
    return;
  }

  instanceNode.textContent = setValueNode.getAttribute('value');
  removeXmlNode(setValueNode);
};

const createItemForInstanceNode = (xmlDoc, parentNode) => (itemNode) => {
  const children = Array.from(itemNode.childNodes);
  const itextIdNode = children.find(n => n.nodeName === 'itextId');
  const nameNode = children.find(n => n.nodeName === 'name');
  if (!itextIdNode || !nameNode) {
    return;
  }

  const itemElem = xmlDoc.createElement('item');
  const labelElem = xmlDoc.createElement('label');
  labelElem.setAttribute('ref', `jr:itext('${itextIdNode.textContent}')`);
  itemElem.appendChild(labelElem);
  const valueElem = xmlDoc.createElement('value');
  valueElem.textContent = nameNode.textContent;
  itemElem.appendChild(valueElem);
  parentNode.appendChild(itemElem);
};

const insertSelectItemsWithMedia = (xmlDoc, instanceNode) => (itemSetNode) => {
  const { parentNode } = itemSetNode;
  getNodes(instanceNode, 'root/item')
    .forEach(createItemForInstanceNode(xmlDoc, parentNode));
  removeXmlNode(itemSetNode);
};

const insertMediaSelectItemsForInstance = (xmlDoc) => (instanceNode) => {
  const instanceId = instanceNode.getAttribute('id');
  getNodes(xmlDoc, `${XPATH_BODY}//itemset[@nodeset="instance('${instanceId}')/root/item"]`)
    .forEach(insertSelectItemsWithMedia(xmlDoc, instanceNode));
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
  },

  /**
   * Selects no longer include all item elements in the body, but instead the choices data is stored centrally as an
   * instance and referenced in the body as an itemset. Unfortunately, this approach breaks the CHT logic for properly
   * updating the media src urls associated with the choices. So, for these selects, we replace the itemset with the
   * actual item elements, which the CHT logic can then handle as before.
   *
   * This is a temporary workaround until we can update the CHT logic to properly handle itemsets with media.
   * https://github.com/XLSForm/pyxform/pull/614
   */
  replaceItemSetsWithMedia: (xmlDoc) => {
    const mediaXpath = `${XPATH_MODEL}/itext/translation/text[value[@form="image" or @form="audio" or @form="video"]]`;
    const allInstanceIdsWithMedia = getNodes(xmlDoc, mediaXpath)
      .map(textNode => textNode.getAttribute('id'))
      .map(id => id.match(/^(.+)-\d+$/))
      .filter(Boolean)
      .map(([, match]) => match);
    const instanceNodes = Array
      .from(new Set(allInstanceIdsWithMedia))
      .map(instanceId => getInstanceNode(xmlDoc, instanceId))
      .filter(Boolean);
    instanceNodes.forEach(insertMediaSelectItemsForInstance(xmlDoc));
  }
};
