const fs = require('../lib/sync-fs');
const supported_shells = ['bash'];

module.exports = shell => {

  if (supported_shells.includes(shell)){
    const completionFile = `${__dirname}/shell-completion.${shell}`;
    if (fs.exists(completionFile)){
      console.log(fs.read(completionFile));
      process.exit(0);
    }
  } else {
    console.log('# ERROR medic-conf shell completion not yet supported for', shell);
    process.exit(1);
  }
};
