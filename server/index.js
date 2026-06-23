const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('crypto');

ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// The time shim, including __renderFrame to guarantee paints
const TIME_SHIM = `
  window.__VTIME_INSTALLED__ = true;
  var vtime = 0;
  function now(){ return vtime; }
  try { Object.defineProperty(performance, 'now', { value: now, configurable: true }); } catch(e){}
  var _Date = Date;
  function FakeDate(){
    if (!(this instanceof FakeDate)) return new _Date(Math.floor(vtime)).toString();
    if (arguments.length === 0) return new _Date(Math.floor(vtime));
    return new (Function.prototype.bind.apply(_Date, [null].concat([].slice.call(arguments))))();
  }
  FakeDate.now = function(){ return Math.floor(vtime); };
  FakeDate.parse = _Date.parse; FakeDate.UTC = _Date.UTC;
  FakeDate.prototype = _Date.prototype;
  try { window.Date = FakeDate; } catch(e){}
  var _origRaf = window.requestAnimationFrame;
  var rafCallbacks = []; var rafId = 0;
  window.requestAnimationFrame = function(cb){ rafId++; rafCallbacks.push({id: rafId, cb: cb}); return rafId; };
  window.cancelAnimationFrame = function(id){ rafCallbacks = rafCallbacks.filter(function(x){ return x.id !== id; }); };
  var timers = []; var timerId = 0;
  var _origSetTimeout = window.setTimeout;
  window.setTimeout = function(fn, delay){
    timerId++; var args = [].slice.call(arguments, 2);
    timers.push({id: timerId, fn: fn, due: vtime + (delay||0), args: args, interval: 0}); return timerId;
  };
  window.setInterval = function(fn, delay){
    timerId++; var args = [].slice.call(arguments, 2); var d = delay || 16;
    timers.push({id: timerId, fn: fn, due: vtime + d, args: args, interval: d}); return timerId;
  };
  window.clearTimeout = window.clearInterval = function(id){ timers = timers.filter(function(t){ return t.id !== id; }); };
  window.__advanceVTime = function(target){
    var STEP = 8;
    while (vtime < target) {
      var next = Math.min(vtime + STEP, target); vtime = next;
      var due = timers.filter(function(t){ return t.due <= vtime; });
      due.sort(function(a,b){ return a.due - b.due; });
      for (var i = 0; i < due.length; i++) {
        var t = due[i];
        try { if (typeof t.fn === 'function') t.fn.apply(window, t.args || []); else (0, eval)(String(t.fn)); } catch(e){}
        if (t.interval > 0) t.due = vtime + t.interval;
        else timers = timers.filter(function(x){ return x.id !== t.id; });
      }
      var cbs = rafCallbacks; rafCallbacks = [];
      for (var j = 0; j < cbs.length; j++) { try { cbs[j].cb(vtime); } catch(e){} }
    }
    try {
      if (document.getAnimations) {
        document.getAnimations().forEach(function(a){ 
          try { 
            a.pause(); 
            if (a.__vstartTime === undefined) a.__vstartTime = vtime;
            a.currentTime = vtime - a.__vstartTime; 
          } catch(e){} 
        });
      }
    } catch(e){}
    try {
      if (window.gsap && window.gsap.globalTimeline) {
        window.gsap.globalTimeline.pause();
        window.gsap.globalTimeline.seek(vtime / 1000);
      }
      if (window.__animeInstances) {
        window.__animeInstances.forEach(function(a){ try { a.pause(); a.seek(vtime); } catch(e){} });
      }
    } catch(e){}
    try { document.documentElement.getBoundingClientRect(); } catch(e){}
  };

  window.__renderFrame = function(target) {
    return new Promise(function(resolve) {
      window.__advanceVTime(target);
      if (typeof _origRaf === 'function') {
        _origRaf(function() {
          _origRaf(resolve);
        });
      } else {
        setTimeout(resolve, 0);
      }
    });
  };
`;

function injectShim(html) {
  const script = `<script>${TIME_SHIM}</script>`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + script);
  return script + html;
}

app.post('/api/render', async (req, res) => {
  const { html, fps = 60, duration = 5, width = 1920, height = 1080, zoom = 1, panX, panY, exportScale = 1 } = req.body;
  if (!html) return res.status(400).json({ error: 'Missing HTML' });

  const jobId = Math.random().toString(36).substring(2, 15);
  const tempDir = path.join(os.tmpdir(), `reelify_${jobId}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const totalFrames = Math.round(fps * duration);
  const frameIntervalMs = 1000 / fps;
  
  const pX = panX ?? (width / 2);
  const pY = panY ?? (height / 2);
  // Round scale to 3 decimal places to prevent floating-point precision crashes in Chrome's texture allocator
  const finalScale = Number((zoom * exportScale).toFixed(3));
  console.log(`[Job ${jobId}] Starting render: ${width}x${height} @ ${fps}fps, ${totalFrames} frames. Zoom: ${zoom}x, Export Scale: ${exportScale}x`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage', 
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--run-all-compositor-stages-before-draw', // Forces Chrome to completely finish GPU rasterization before taking screenshots
        '--js-flags="--max-old-space-size=4096"'
      ]
    });
    const page = await browser.newPage();
    
    // deviceScaleFactor applies BOTH the crop-zoom and the resolution clarity scaling
    await page.setViewport({ width, height, deviceScaleFactor: finalScale });
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // We no longer use CDP Animation.setPlaybackRate(0) because it destroys CSS Transitions, 
    // causing them to snap to the end state instantly instead of growing.
    const client = await page.target().createCDPSession();

    const processedHtml = injectShim(html);
    await page.setContent(processedHtml, { waitUntil: 'networkidle0' });
    
    console.log(`[Job ${jobId}] Page loaded. Extracting frames...`);

    // Frame capture loop
    for (let i = 0; i < totalFrames; i++) {
      const timeMs = i * frameIntervalMs;
      
      // Advance JS time and wait for the compositor to physically paint the frame
      // (This shim also internally scrubs document.getAnimations() synchronously)
      await page.evaluate((t) => {
        if (typeof window.__renderFrame === 'function') {
          return window.__renderFrame(t);
        } else if (typeof window.__advanceVTime === 'function') {
          window.__advanceVTime(t);
        }
      }, timeMs);

      // We Math.round() clip values because Chrome crashes ("Target closed") if requested to clip fractional pixels at high resolutions
      const clipWidth = Math.round(width / zoom);
      const clipHeight = Math.round(height / zoom);
      const clipX = Math.round(pX - (clipWidth / 2));
      const clipY = Math.round(pY - (clipHeight / 2));

      // Give the compositor extra time to flush the massive 4K/2K texture to the GPU readback buffer.
      // If we screenshot instantly after RAF, Chrome might return the *previous* stale frame under heavy load, causing duplicate frames (stuttering).
      // We increased this from 20ms to 40ms to ensure 100% stability.
      await new Promise(r => setTimeout(r, 40));

      const framePath = path.join(tempDir, `frame_${String(i).padStart(5, '0')}.jpg`);
      await page.screenshot({ 
        path: framePath, 
        type: 'jpeg',
        quality: 100,
        clip: { x: clipX, y: clipY, width: clipWidth, height: clipHeight }
      });
      
      // Heavy Breather to prevent WebSocket memory overflow on 4K renders.
      // 4K takes much longer to encode in Chrome memory, so we need a larger breather
      if (i % 2 === 0) await new Promise(r => setTimeout(r, 100));
      
      // Progress logging
      if (i % 50 === 0) console.log(`[Job ${jobId}] Progress: ${i}/${totalFrames} frames...`);
    }

    console.log(`[Job ${jobId}] Captured ${totalFrames} frames. Encoding MP4...`);
    await browser.close();

    const outputPath = path.join(tempDir, 'output.mp4');

    // Determine encoding quality based on output resolution
    // 4K videos at CRF 18 create massive bitrates that stutter during playback on most media players.
    const isHighRes = (width * exportScale) > 1920;
    const crf = isHighRes ? '23' : '18';

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(path.join(tempDir, 'frame_%05d.jpg'))
        .inputOptions([`-framerate ${fps}`])
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-preset medium', // Medium gives better compression than fast, lowering bitrate for smoother playback
          `-crf ${crf}`,
          '-profile:v high', // Ensures hardware decoders can handle it
          '-level 5.2',      // Required for high-res 60fps playback compatibility
          '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2' // Forces width and height to be EVEN numbers. Prevents crash code 3752568763
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', (err) => reject(new Error('FFmpeg encoding failed: ' + err.message)))
        .run();
    });

    console.log(`[Job ${jobId}] Encoding finished. Sending file...`);
    res.download(outputPath, 'render.mp4', () => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

  } catch (error) {
    console.error(`[Job ${jobId}] Error:`, error);
    if (browser) await browser.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 7860;
const server = app.listen(PORT, () => {
  console.log(`Studio Backend listening on port ${PORT}`);
});
server.setTimeout(0); // Disable the default 2-minute timeout for long renders
