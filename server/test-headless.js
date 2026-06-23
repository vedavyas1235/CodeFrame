const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--run-all-compositor-stages-before-draw'] });
    const page = await browser.newPage();
    await page.setContent('<div>Test</div>');
    const client = await page.target().createCDPSession();
    await client.send('HeadlessExperimental.enable');
    const { screenshotData } = await client.send('HeadlessExperimental.beginFrame', { frameTimeTicks: 1000, interval: 16.666, noDisplayUpdates: false, screenshot: { format: 'png' } });
    console.log('Success! Screenshot size:', screenshotData.length);
    await browser.close();
  } catch (e) {
    console.error('Error in new headless:', e.message);
    process.exit(1);
  }
})();
