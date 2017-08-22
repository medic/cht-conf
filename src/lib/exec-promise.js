const exec = require('child_process').exec;

// TODO might be important to sanitise input to `exec()` to prevent injection
// attacks by devious tech leads.

module.exports = (...args) => new Promise((resolve, reject) => {

    const sub = exec(args.join(' '),
      { stdio: [ 'ignore', 'pipe', 'pipe' ] },
      (err, stdout, stderr) => {
        if(err) reject(stderr);
        else resolve();
      });

    sub.stdout.pipe(process.stdout);
    sub.stderr.pipe(process.stderr);

  });
