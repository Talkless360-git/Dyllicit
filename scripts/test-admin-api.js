const fetch = require('node-fetch');

async function testApi() {
  const urls = [
    'http://localhost:3000/api/admin/stats',
    'http://localhost:3000/api/admin/royalties/stats'
  ];

  for (const url of urls) {
    try {
      console.log(`Testing ${url}...`);
      const resp = await fetch(url);
      console.log(`  Status: ${resp.status}`);
      const text = await resp.text();
      console.log(`  Body: ${text.slice(0, 100)}...`);
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

testApi();
