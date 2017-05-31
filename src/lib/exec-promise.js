const exec = require('child_process').exec;

module.exports = (...args) =>
  new Promise((resolve, reject) =>
    exec(args.join(' '), err => {
      return err ? reject(err) : resolve();
    }));
