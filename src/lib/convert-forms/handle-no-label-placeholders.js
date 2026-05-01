const { getNodes, removeNode, XPATH_MODEL, XPATH_BODY } = require('../forms-utils');
const log = require('../log');

module.exports = {
  /**
   * Removes the "NO_LABEL" labels placeholder. XLSForm does not allow converting a field without a label, so the CHT
   * convention is to use a "NO_LABEL" placeholder value.
   */
  removeNoLabelNodes: (xmlDoc) => {
    const noLabelNodes = getNodes(xmlDoc, `${XPATH_MODEL}/itext/translation//value[text()="NO_LABEL"]`);
    if (noLabelNodes.length > 0) {
      log.warn(
        'The "NO_LABEL" value is deprecated and will be removed in a future version of cht-conf. '+
        'For groups, a label is not required. For other fields, if you set a hint you do not have to provide a label. '+
        'If the field should not be visible, use "hidden" or "calculate" types.'
      );
    }

    const noLabelItextNodes = getNodes(
      xmlDoc,
      `${XPATH_MODEL}/itext/translation//text[count(*)=1 and (value="NO_LABEL" or value="DELETE_THIS_LINE")]`
    );
    const noLabelNodeIds = Array.from(new Set(noLabelItextNodes.map(textNode => textNode.getAttribute('id'))));
    noLabelNodeIds
      .flatMap(id => getNodes(xmlDoc, `${XPATH_BODY}//label[@ref="jr:itext('${id}')"]`))
      .forEach(removeNode);
    noLabelItextNodes.forEach(removeNode);

    // Remove any additional NO_LABEL values from translation nodes that have other (multimedia) values
    getNodes(xmlDoc, `${XPATH_MODEL}/itext/translation//value[text()="NO_LABEL" or text()="DELETE_THIS_LINE"]`)
      .forEach(removeNode);
  }
};
