const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Forward console logs from the page
  page.on('console', msg => {
    if (msg.text().includes('Frame captured') || msg.text().includes('HQ export')) {
      console.log('PAGE LOG:', msg.text());
    }
  });

  console.log("Navigating to http://localhost:8080...");
  await page.goto('http://localhost:8080');

  // Wait for the app to load
  await page.waitForSelector('textarea', { timeout: 10000 });
  console.log("App loaded.");

  // Switch to High Quality mode
  console.log("Selecting High Quality mode...");
  const select = await page.$('select');
  if (select) {
    await select.select('tabcapture');
  } else {
    // try to find the select by text or other means
    const selects = await page.$$('select');
    for (const s of selects) {
      const val = await page.evaluate(el => el.value, s);
      if (val === 'realtime') {
        await s.select('tabcapture');
        break;
      }
    }
  }

  // Click Export
  console.log("Clicking Export...");
  const buttons = await page.$$('button');
  let exportBtn = null;
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Export Video')) {
      exportBtn = b;
      break;
    }
  }

  if (exportBtn) {
    await exportBtn.click();
    console.log("Export started. Monitoring for 20 seconds...");
    await new Promise(r => setTimeout(r, 20000));
  } else {
    console.log("Export button not found.");
  }

  await browser.close();
  console.log("Done.");
})();
