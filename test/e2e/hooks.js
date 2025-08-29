const { spinUpCht, tearDownCht } = require('./cht-docker-utils');
const axios = require('axios');

async function waitForChtReady(retries = 30, delay = 10000) {
  for (let i = 0; i < retries; i++) {
    try {
      // Adjust URL if different (e.g. port 5988 or 5984 depending on CHT config)
      const res = await axios.get('http://localhost:5988/api/health');
      if (res.status === 200) {
        console.log("✅ CHT is ready");
        return;
      }
    } catch (err) {
      console.log(`⏳ Waiting for CHT... attempt ${i + 1}`);
    }
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error("❌ CHT did not become ready in time");
}

before(async function () {
  this.timeout(300000); // give up to 5 mins for startup in CI
  await tearDownCht();
  await spinUpCht();
  await waitForChtReady(); // NEW: poll until healthy
});

after(async () => {
  await tearDownCht();
});
