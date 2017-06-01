const execSync = require('child_process').execSync;

// TODO might be important to sanitise input to `exec()` to prevent injection
// attacks by devious tech leads.

module.exports = (...args) => {
  try {
    execSync(args.join(' '), {
      stdio: ['ignore', process.stdout, process.stderr],
    });
    return Promise.resolve();
  } catch(e) {
    return Promise.reject(e);
  }
};
