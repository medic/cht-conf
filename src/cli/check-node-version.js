const MIN_NODE_VERSION = 6;
const currentNodeVersion = process.versions.node;

module.exports = () => {
  const currentMajor = process.versions.node.split('.')[0];
  if (Number.parseInt(currentMajor) < MIN_NODE_VERSION) {
    throw new Error(`Your NodeJS is too old.
      You are running node version: ${currentNodeVersion}
      cht-conf requires version:  ${MIN_NODE_VERSION}
    Please upgrade node to continue.`);
  }
};
