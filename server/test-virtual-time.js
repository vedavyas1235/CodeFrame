const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.setContent(`
      <style>
        #box { width: 0px; height: 100px; background: blue; transition: width 1s linear; }
        #box.active { width: 500px; }
      </style>
      <div id="box"></div>
      <script>
        // Force the browser to register the initial state
        document.getElementById('box').getBoundingClientRect();
        
        requestAnimationFrame(() => {
          document.getElementById('box').classList.add('active');
        });
      </script>
    `);
    
    const client = await page.target().createCDPSession();
    await client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
    
    for(let i=0; i<6; i++) {
      await client.send('Emulation.setVirtualTimePolicy', { 
        policy: 'advance', 
        budget: 200 
      });
      await new Promise(resolve => client.once('Emulation.virtualTimeBudgetExpired', resolve));
      
      const width = await page.evaluate(() => {
        // Force style recalc
        return window.getComputedStyle(document.getElementById('box')).width;
      });
      console.log(`Frame ${i} (+200ms): width = ${width}`);
    }
    
    await browser.close();
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
