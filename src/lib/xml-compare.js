/**
 * XML DOM comparison utility
 * Replaces dom-compare package to eliminate vulnerable xmldom@0.1.19 dependency
 * Uses @xmldom/xmldom which is already a project dependency
 */

/**
 * Create a difference object
 * @param {string} path - XPath to the differing node
 * @param {string} message - Description of the difference
 * @returns {Object} Difference object with path and message
 */
const createDifference = (path, message) => ({ path, message });

/**
 * Create a result object for DOM comparison
 * @returns {Object} Result object with methods for managing differences
 */
const createCompareResult = () => {
  const differences = [];

  return {
    addDifference: (path, message) => differences.push(createDifference(path, message)),
    getResult: () => differences.length === 0,
    getDifferences: () => differences
  };
};

/**
 * Get siblings with the same node name
 */
const getSameNameSiblings = (node) => {
  const parent = node?.parentNode;
  if (!parent?.childNodes) {
    return [];
  }
  return Array.from(parent.childNodes)
    .filter(n => n.nodeType === 1 && n.nodeName === node.nodeName);
};

/**
 * Get the XPath-like path to a node
 */
const getNodePath = (node) => {
  const parts = [];
  let current = node;

  while (current?.nodeType === 1) {
    let name = current.nodeName;
    const siblings = getSameNameSiblings(current);

    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      name = `${name}[${index}]`;
    }

    parts.unshift(name);
    current = current.parentNode;
  }

  return '/' + parts.join('/');
};

/**
 * Get normalized text content of a node (trimmed, whitespace collapsed)
 */
const getNormalizedText = (node) => {
  if (!node) {
    return '';
  }
  const text = node.textContent || '';
  return text.trim().replaceAll(/\s+/g, ' ');
};

/**
 * Get attributes as a sorted array of {name, value} objects
 */
const getAttributes = (node) => {
  if (!node?.attributes?.length) {
    return [];
  }

  // Convert NamedNodeMap to array (it's array-like but not directly iterable)
  const attrArray = Array.from({ length: node.attributes.length }, (_, i) => node.attributes[i]);

  return attrArray
    .map(attr => ({ name: attr.name, value: attr.value }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get child elements (excluding text nodes, comments, etc.)
 */
const getChildElements = (node) => {
  if (!node?.childNodes) {
    return [];
  }
  return Array.from(node.childNodes).filter(n => n.nodeType === 1);
};

/**
 * Check a single expected attribute against actual attributes
 */
const checkExpectedAttribute = (expAttr, actualAttrs, result, currentPath) => {
  const actAttr = actualAttrs.find(a => a.name === expAttr.name);
  if (!actAttr) {
    result.addDifference(currentPath, `Missing attribute '${expAttr.name}'`);
    return;
  }
  if (actAttr.value !== expAttr.value) {
    const msg = `Attribute '${expAttr.name}' expected '${expAttr.value}' but got '${actAttr.value}'`;
    result.addDifference(currentPath, msg);
  }
};

/**
 * Check for unexpected attributes in actual node
 */
const checkUnexpectedAttributes = (actualAttrs, expectedAttrs, result, currentPath) => {
  for (const actAttr of actualAttrs) {
    const expAttr = expectedAttrs.find(a => a.name === actAttr.name);
    if (!expAttr) {
      result.addDifference(currentPath, `Unexpected attribute '${actAttr.name}'`);
    }
  }
};

/**
 * Compare attributes between two nodes
 */
const compareAttributes = (expected, actual, result, currentPath) => {
  const expectedAttrs = getAttributes(expected);
  const actualAttrs = getAttributes(actual);

  for (const expAttr of expectedAttrs) {
    checkExpectedAttribute(expAttr, actualAttrs, result, currentPath);
  }

  checkUnexpectedAttributes(actualAttrs, expectedAttrs, result, currentPath);
};

/**
 * Compare text content of leaf nodes
 */
const compareTextContent = (expected, actual, result, currentPath) => {
  const expectedChildren = getChildElements(expected);
  const actualChildren = getChildElements(actual);

  if (expectedChildren.length === 0 && actualChildren.length === 0) {
    const expectedText = getNormalizedText(expected);
    const actualText = getNormalizedText(actual);

    if (expectedText !== actualText) {
      result.addDifference(currentPath, `Expected text '${expectedText}' but got '${actualText}'`);
    }
  }
};

/**
 * Compare a pair of child elements at the same position
 */
const compareChildPair = (expChild, actChild, result, currentPath) => {
  if (expChild && actChild) {
    compareNodes(expChild, actChild, result, getNodePath(expChild));
    return;
  }
  if (expChild) {
    result.addDifference(getNodePath(expChild), `Missing expected element '${expChild.nodeName}'`);
    return;
  }
  if (actChild) {
    result.addDifference(currentPath, `Unexpected element '${actChild.nodeName}'`);
  }
};

/**
 * Compare child elements of two nodes
 */
const compareChildElements = (expected, actual, result, currentPath) => {
  const expectedChildren = getChildElements(expected);
  const actualChildren = getChildElements(actual);
  const maxChildren = Math.max(expectedChildren.length, actualChildren.length);

  for (let i = 0; i < maxChildren; i++) {
    compareChildPair(expectedChildren[i], actualChildren[i], result, currentPath);
  }
};

/**
 * Compare two DOM nodes recursively
 */
const compareNodes = (expected, actual, result, path = '') => {
  if (!expected && !actual) {
    return;
  }

  if (!expected) {
    result.addDifference(path || '/', `Unexpected node '${actual.nodeName}'`);
    return;
  }

  if (!actual) {
    result.addDifference(path || '/', `Missing expected node '${expected.nodeName}'`);
    return;
  }

  const currentPath = path || '/';

  if (expected.nodeName !== actual.nodeName) {
    result.addDifference(currentPath, `Expected element '${expected.nodeName}' instead of '${actual.nodeName}'`);
    return;
  }

  compareAttributes(expected, actual, result, currentPath);
  compareTextContent(expected, actual, result, currentPath);
  compareChildElements(expected, actual, result, currentPath);
};

/**
 * Compare two DOM documents
 * @param {Document} expected - The expected DOM document
 * @param {Document} actual - The actual DOM document
 * @returns {Object} - Result object with getResult() and getDifferences() methods
 */
const compare = (expected, actual) => {
  const result = createCompareResult();
  compareNodes(expected.documentElement, actual.documentElement, result, '/');
  return result;
};

/**
 * Group differences by their path
 */
const groupDifferencesByPath = (differences) => {
  const grouped = {};
  for (const diff of differences) {
    if (!grouped[diff.path]) {
      grouped[diff.path] = [];
    }
    grouped[diff.path].push(diff.message);
  }
  return grouped;
};

/**
 * Format grouped differences as lines
 */
const formatGroupedDifferences = (grouped) => {
  const lines = [];
  for (const path of Object.keys(grouped)) {
    lines.push(path);
    for (const message of grouped[path]) {
      lines.push(`\t${message}`);
    }
  }
  return lines;
};

/**
 * Reporter that formats differences in a grouped manner
 * Compatible with dom-compare's GroupingReporter
 */
const GroupingReporter = {
  /**
   * Format comparison result as a human-readable string
   * @param {Object} result - The comparison result
   * @returns {string} - Formatted diff string
   */
  report(result) {
    const differences = result.getDifferences();
    if (differences.length === 0) {
      return '';
    }

    const grouped = groupDifferencesByPath(differences);
    const lines = formatGroupedDifferences(grouped);
    return lines.join('\n');
  }
};

// For backwards compatibility, export factory functions as classes
const Difference = createDifference;
const CompareResult = createCompareResult;

module.exports = {
  compare,
  GroupingReporter,
  CompareResult,
  Difference
};
