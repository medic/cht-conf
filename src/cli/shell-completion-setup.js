const fs = require('../lib/sync-fs');
const supported_shells = ['bash'];

module.exports = shell => {

  if (supported_shells.includes(shell)){
    const completionFile = `${__dirname}/shell-completion.${shell}`;
    if (fs.exists(completionFile)){
      console.log(fs.read(completionFile));
      process.exit(0);
    }
  } else if (shell === true){
    console.log('# ERROR shell type argument not provided e.g. --shell-completion=bash');
  } else {
    console.error('shell completion not yet supported for', shell);
    process.exit(1);
  }
  process.exit(1);
};
