const { spinUpCht, tearDownCht } = require('./cht-docker-utils');

before(async () => {
    await spinUpCht();
});

after(async () => {
    await tearDownCht();
});
