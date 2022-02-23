const fs = require('../lib/sync-fs');

const SUPPORTED_SHELLS = ['bash'];

module.exports = shell => {
  if (SUPPORTED_SHELLS.includes(shell)){
    const completionFile = `${__dirname}/shell-completion.${shell}`;
    if (fs.exists(completionFile)){
      console.log(fs.read(completionFile));
      return;
    }
  } else if (shell === true){
    throw new Error('shell type argument not specified e.g. --shell-completion=bash');
  } else {
    throw new Error(`completion not yet supported for '${shell}' shell`);
  }
};
