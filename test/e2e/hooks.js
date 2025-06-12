const { spinUpCht, tearDownCht } = require('./cht-docker-utils');

before(async () => {
  // cleanup eventual leftovers before starting
  await tearDownCht();
  await spinUpCht();
});

after(async () => {
  await tearDownCht();
});
