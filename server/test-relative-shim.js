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
        var vtime = 0;
        window.__advanceVTime = function(target) {
          vtime = target;
          document.getAnimations().forEach(a => {
            a.pause();
            if (a.__vstartTime === undefined) a.__vstartTime = vtime;
            a.currentTime = vtime - a.__vstartTime;
          });
        }
        
        // At 200ms, add class
        setTimeout(() => document.getElementById('box').classList.add('active'), 200);
      </script>
    `);
    
    // Simulate our render loop
    for(let i=0; i<=5; i++) {
      const timeMs = i * 200; // 0, 200, 400, 600, 800, 1000
      
      const width = await page.evaluate((t) => {
        // execute setTimeout logic
        if (t === 200) document.getElementById('box').classList.add('active');
        
        // Call shim
        window.__advanceVTime(t);
        
        return window.getComputedStyle(document.getElementById('box')).width;
      }, timeMs);
      
      console.log(`Frame ${i} (vtime = ${timeMs}): width = ${width}`);
    }
    
    await browser.close();
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
