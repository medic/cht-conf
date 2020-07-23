const environment = require('./environment');
const readline = require('readline-sync');


function keyInYN() {
  if (environment.force) {
    return true;
  }

  return readline.keyInYN(); 
}

function question(question, options = {}) {
  return readline.question(question, options);
}

function keyInSelect(items, question, options = {}) {
  if (environment.force) {
    return -1;
  }
  return readline.keyInSelect(items, question, options);
}

module.exports = {
  keyInYN,
  question,
  keyInSelect
};