const { getNodes, XPATH_MODEL, XPATH_BODY } = require('../forms-utils');

// xmldom does not support node.remove(), so we use parentNode.removeChild(node) instead
const removeXmlNode = node => node.parentNode.removeChild(node); // NOSONAR

module.exports = {
  /**
   * Removes the "NO_LABEL" labels placeholder. XLSForm does not allow converting a field without a label, so the CHT
   * convention is to use a "NO_LABEL" placeholder value.
   */
  removeNoLabelNodes: (xmlDoc) => {
    const noLabelItextNodes = getNodes(
      xmlDoc,
      `${XPATH_MODEL}/itext/translation//text[count(*)=1 and (value="NO_LABEL" or value="DELETE_THIS_LINE")]`
    );
    const noLabelNodeIds = Array.from(new Set(noLabelItextNodes.map(textNode => textNode.getAttribute('id'))));
    noLabelNodeIds
      .flatMap(id => getNodes(xmlDoc, `${XPATH_BODY}//label[@ref="jr:itext('${id}')"]`))
      .forEach(removeXmlNode);
    noLabelItextNodes.forEach(removeXmlNode);

    // Remove any additional NO_LABEL values from translation nodes that have other (multimedia) values
    getNodes(xmlDoc, `${XPATH_MODEL}/itext/translation//value[text()="NO_LABEL" or text()="DELETE_THIS_LINE"]`)
      .forEach(removeXmlNode);
  }
};
