const assert = require('chai').assert;
const { exec } = require('child_process');

describe('shell-completion', () => {

  it('should complete a partial command', () => {

    const partial = 'comp';
    const bin = 'medic-conf';
    const input = bin + ' ' + partial;

    // This command sets environment variables for bash completion and checks output
    // of the complete command against incomplete user input specified in environment variables
    const cmd = `
      bash -i -c '
        source /etc/bash_completion;
        COMP_LINE="${input}";
        COMP_WORDS=(${input});
        COMP_CWORD=1;
        COMP_POINT=${input.length};
        $(complete -p medic-conf | sed "s/.*-F \\([^ ]*\\) .*/\\1/") && echo \$\{COMPREPLY[*]\}'`; // eslint-disable-line no-useless-escape

    exec(cmd, { encoding: 'utf8' }, (err, stdout) => {

      assert.equal(stdout, 'compile-app-settings compress-pngs compress-svgs\n');

    });

  });

});
