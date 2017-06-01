const fs = require('../lib/sync-fs');

module.exports = shell => {
  if(!shell) shell = 'bash';

  const completionFile = `${fs.path.dirname(require.main.filename)}/../src/cli/shell-completion.${shell}`;

  if(fs.exists(completionFile)) {
    console.log(fs.read(completionFile));
    process.exit(0);
  } else {
    console.log('# ERROR medic-conf shell completion not yet supported for', shell);
    process.exit(1);
  }
};
