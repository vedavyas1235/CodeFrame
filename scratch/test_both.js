const fetch = require('node-fetch'); // wait node 18+ has fetch natively

async function testAuth(url) {
  try {
    const res = await fetch(url + '/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer SuPer@07#Man001@2#3$5' },
      body: JSON.stringify({ html: 'test' })
    });
    
    console.log(`\n=== Testing ${url} ===`);
    console.log(`Status: ${res.status}`);
    const contentType = res.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    
    if (res.status === 401) {
      console.log(`Response: ${await res.text()}`);
    } else {
      console.log(`SUCCESS! It returned a file of size: ${res.headers.get('content-length')} bytes`);
    }
  } catch (e) {
    console.error(`Fetch failed for ${url}:`, e);
  }
}

async function run() {
  await testAuth('https://vedavyas1235-animateit.hf.space');
  await testAuth('https://vedavyas1235-animateit-server2.hf.space'); // Guessing the url for space 2
}
run();
