module.exports = {
  init: function(target, message) {
    let runningTotal = 0;
    if(!message) message = '';

    return {
      increment: (inc) => { runningTotal += inc; },
      print: () => {
        const percent = Math.floor(runningTotal * 100 / target);
        let bar = '', i;

	const formattedMessage = message.replace('{{N}}', runningTotal).replace('{{M}}', target);

        const barTotal = process.stdout.columns - formattedMessage.length - 9;
        const pBarLen = i = Math.floor(runningTotal * barTotal / target);

        while(--i >= 0) bar += '█';

        i = barTotal - pBarLen;
        while(--i >= 0) bar += ' ';

        process.stdout.write(`\r${formattedMessage}[${bar}] (${percent}%)`);
      },
      complete: () => runningTotal >= target,
    };
  },
};
