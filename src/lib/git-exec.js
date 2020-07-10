const exec = require('./exec-promise');

const GIT = 'git';    // Git command path

module.exports.gitStatus = () => {
  return exec(GIT, 'status');
};
