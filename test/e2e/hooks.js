const { spinUpCHT, tearDownCHT } = require('./cht-docker-utils');

before(async () => {
    await spinUpCHT();
});

after(async () => {
    await tearDownCHT();
});
