const environment = require('./environment');
const readline = require('readline-sync');


function keyInYN() {
    if (environment.force) {
      return true;
    }

    return readline.keyInYN(); 
}


module.exports = {
  keyInYN
}