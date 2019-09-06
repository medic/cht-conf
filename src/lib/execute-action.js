module.exports = (action, instanceUrl, extraArgs, projectDir) => require(`../fn/${action}`)(projectDir, instanceUrl, extraArgs);

