const { getNodes, XPATH_BODY, getInstanceNode, XPATH_MODEL } = require('../forms-utils');

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

const getInstanceIdFromNodeset = (itemsetNode) => {
  return itemsetNode
    .getAttribute('nodeset')
    .match(/^instance\('([^']+)'\)/)[1];
};

const removeXmlNode = node => node.parentNode.removeChild(node);

const insertSelectItemsWithMedia = (xmlDoc, instanceNode) => (itemSetNode) => {
  const { parentNode } = itemSetNode;
  const instanceId = getInstanceIdFromNodeset(itemSetNode);
  if (!instanceId) {
    return;
  }

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
   * Selects no longer include all item elements in the body, but instead the choices data is stored centrally as an
   * instance and referenced in the body as an itemset. Unfortunately, this approach breaks the CHT logic for properly
   * updating the media src urls associated with the choices. So, for these selects, we replace the itemset with the
   * actual item elements, which the CHT logic can then handle as before.
   *
   * This is a temporary workaround until we can update the CHT logic to properly handle itemsets with media.
   * https://github.com/XLSForm/pyxform/pull/614
   * @param xmlDoc
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
