import htmlToImageRaw from "html-to-image/dist/html-to-image.js?raw";

// ─────────────────────────────────────────────────────────────────────────────
// TIME SHIM — injected into the iframe to give us synthetic clock control
// ─────────────────────────────────────────────────────────────────────────────
export const TIME_SHIM = `
  window.__VTIME_INSTALLED__ = true;
  var vtime = 0;
  
  window.__nativeSetTimeout = window.setTimeout;
  window.__nativeClearTimeout = window.clearTimeout;
  window.__nativeSetInterval = window.setInterval;
  window.__nativeClearInterval = window.clearInterval;
  window.__nativeDate = window.Date;
  window.__nativePerformance = window.performance;

  var _origDate = Date;
  window.Date = function() {
    if (arguments.length === 0) return new _origDate(vtime);
    return new _origDate(...arguments);
  };
  window.Date.now = function() { return vtime; };
  window.Date.parse = _origDate.parse;
  window.Date.UTC = _origDate.UTC;

  if (window.performance) {
    window.performance.now = function() { return vtime; };
  }

  var rafCallbacks = []; var rafId = 0;
  window.__origRaf = window.requestAnimationFrame;
  window.__origCancelRaf = window.cancelAnimationFrame;
  window.requestAnimationFrame = function(cb){ rafId++; rafCallbacks.push({id: rafId, cb: cb}); return rafId; };
  window.cancelAnimationFrame = function(id){ rafCallbacks = rafCallbacks.filter(function(x){ return x.id !== id; }); };

  var timeoutCallbacks = []; var timeoutId = 0;
  window.setTimeout = function(cb, delay){
    timeoutId++;
    timeoutCallbacks.push({id: timeoutId, cb: typeof cb === 'function' ? cb : function(){}, triggerTime: vtime + (delay || 0)});
    return timeoutId;
  };
  window.clearTimeout = function(id){ timeoutCallbacks = timeoutCallbacks.filter(function(x){ return x.id !== id; }); };

  var intervalCallbacks = []; var intervalId = 0;
  window.setInterval = function(cb, delay){
    intervalId++;
    intervalCallbacks.push({id: intervalId, cb: typeof cb === 'function' ? cb : function(){}, interval: delay || 0, nextTime: vtime + (delay || 0)});
    return intervalId;
  };
  window.clearInterval = function(id){ intervalCallbacks = intervalCallbacks.filter(function(x){ return x.id !== id; }); };

  window.__advanceVTime = function(target){
    var STEP = 8;
    while (vtime < target) {
      vtime = Math.min(vtime + STEP, target);
      var pendingTimeouts = timeoutCallbacks;
      timeoutCallbacks = [];
      for (var k = 0; k < pendingTimeouts.length; k++) {
        if (pendingTimeouts[k].triggerTime <= vtime) {
          try { pendingTimeouts[k].cb(); } catch(e){}
        } else {
          timeoutCallbacks.push(pendingTimeouts[k]);
        }
      }
      for (var l = 0; l < intervalCallbacks.length; l++) {
        if (intervalCallbacks[l].nextTime <= vtime) {
          try { intervalCallbacks[l].cb(); } catch(e){}
          intervalCallbacks[l].nextTime = vtime + intervalCallbacks[l].interval;
        }
      }
      var cbs = rafCallbacks; rafCallbacks = [];
      for (var j = 0; j < cbs.length; j++) { try { cbs[j].cb(vtime); } catch(e){} }
      if (document.getAnimations) {
        document.getAnimations().forEach(function(a){ a.currentTime = vtime; });
      }
    }
  };
`;

// ─────────────────────────────────────────────────────────────────────────────
// CAPTURE AGENT — injected into the iframe to listen for frame requests
// ─────────────────────────────────────────────────────────────────────────────
const CAPTURE_AGENT = `
window.addEventListener('message', async (e) => {
  if (!e.data || !e.data.type) return;

  if (e.data.type === 'check-media') {
    const canvases = Array.from(document.querySelectorAll("canvas"));
    let hasFullscreenCanvas = false;
    for (const c of canvases) {
      const style = window.getComputedStyle(c);
      if (style.position === 'fixed' || style.position === 'absolute') {
        hasFullscreenCanvas = true; break;
      }
    }
    if (!hasFullscreenCanvas && canvases.length === 1) hasFullscreenCanvas = true;
    e.source.postMessage({ type: 'media-checked', hasFullscreenCanvas }, '*');
    return;
  }

  if (e.data.type === 'capture-frame') {
    try {
      const { timeMs, mode, width, height } = e.data;
      if (typeof window.__advanceVTime === 'function') {
        window.__advanceVTime(timeMs);
      }
      
      await new Promise(r => {
         const raf = window.__origRaf || window.requestAnimationFrame || (cb => setTimeout(cb, 16));
         raf(r);
      });

      let bitmap = null;
      if (mode === 'quick') {
        const canvases = Array.from(document.querySelectorAll("canvas"));
        let srcCanvas = null;
        for (const c of canvases) {
          const style = window.getComputedStyle(c);
          if (style.position === 'fixed' || style.position === 'absolute') {
            srcCanvas = c; break;
          }
        }
        if (!srcCanvas && canvases.length === 1) srcCanvas = canvases[0];
        if (!srcCanvas) throw new Error("No full-screen canvas found for Quick Mode.");
        
        bitmap = await createImageBitmap(srcCanvas);
      } else if (mode === 'hq') {
        if (!window.htmlToImage) throw new Error("html-to-image not loaded inside iframe.");
        
        // Persistent OffscreenCanvas allocation
        if (!window.__hqCanvas) {
          window.__hqCanvas = new OffscreenCanvas(width, height);
          window.__hqCtx = window.__hqCanvas.getContext('2d', { alpha: false, desynchronized: true });
        } else if (window.__hqCanvas.width !== width || window.__hqCanvas.height !== height) {
          window.__hqCanvas.width = width;
          window.__hqCanvas.height = height;
        }
        const off = window.__hqCanvas;
        const ctx = window.__hqCtx;
        
        document.documentElement.style.width = width + 'px';
        document.documentElement.style.height = height + 'px';
        document.documentElement.style.overflow = 'hidden';
        if (document.body) {
          document.body.style.width = width + 'px';
          document.body.style.height = height + 'px';
          document.body.style.overflow = 'hidden';
        }
        window.scrollTo(0, 0);

        if (typeof window.__cachedFontCss === 'undefined') {
          try {
            window.__cachedFontCss = await window.htmlToImage.getFontEmbedCSS(document.documentElement);
          } catch(e) {
            window.__cachedFontCss = '';
          }
        }

        const dpr = window.devicePixelRatio || 1;
        const blob = await window.htmlToImage.toBlob(document.documentElement, {
          width: width * dpr,
          height: height * dpr,
          pixelRatio: 1,
          style: { transform: 'scale(' + dpr + ')', transformOrigin: 'top left' },
          type: 'image/jpeg',
          quality: 0.97,
          backgroundColor: '#ffffff',
          fontEmbedCSS: window.__cachedFontCss,
          filter: (node) => {
            if (node.tagName && node.tagName.toUpperCase() === 'IFRAME') return false;
            return true;
          }
        });
        
        if (!blob) throw new Error("html-to-image returned a null blob.");
        
        const domSnap = await createImageBitmap(blob);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(domSnap, 0, 0, width, height);
        domSnap.close();
        
        const canvases = Array.from(document.querySelectorAll("canvas"));
        const videos = Array.from(document.querySelectorAll("video"));
        const drawEl = (el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            try { ctx.drawImage(el, r.left, r.top, r.width, r.height); } catch(e){}
          }
        };
        canvases.forEach(drawEl);
        videos.forEach(drawEl);
        
        bitmap = off.transferToImageBitmap();
      }
      
      e.source.postMessage({ type: 'frame-captured', bitmap, error: null }, '*', [bitmap]);
    } catch (err) {
      e.source.postMessage({ type: 'frame-captured', bitmap: null, error: err.message }, '*');
    }
  }
});
`;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface CaptureProgress {
  stage: "preparing" | "capturing" | "encoding" | "done";
  current?: number;
  total?: number;
  message?: string;
  droppedFrames?: number;
}

export interface CaptureSignal {
  cancelled: boolean;
  abortController?: AbortController;
  jobId?: string;
  cancelEndpoint?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const IDENTICAL_FRAMES_MSG =
  "All captured frames are identical — the animation may not be running. " +
  "Try Studio mode for complex animations, or verify your HTML plays in the preview.";

/** Load HTML into an iframe, optionally injecting the time shim and capture agent. */
export function loadIframeWithHtml(
  iframe: HTMLIFrameElement,
  html: string,
  needShim: boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let finalHtml = html;

    // Fix html-to-image SecurityError by forcing CORS on all external stylesheets
    finalHtml = finalHtml.replace(/<link([^>]+)>/gi, (m, p1) => {
      if (p1.toLowerCase().includes('rel="stylesheet"') && !p1.toLowerCase().includes('crossorigin')) {
        return `<link${p1} crossorigin="anonymous">`;
      }
      return m;
    });

    if (needShim) {
      // Escape </script> tags in htmlToImageRaw to prevent breaking the injected script block
      const safeHtmlToImage = htmlToImageRaw.replace(/<\/script>/gi, '<\\/script>');
      const injection = `
        <script>${TIME_SHIM}</script>
        <script>
          (function(setTimeout, setInterval, clearTimeout, clearInterval, Date, performance, requestAnimationFrame, cancelAnimationFrame) {
            ${safeHtmlToImage}
          })(window.__nativeSetTimeout, window.__nativeSetInterval, window.__nativeClearTimeout, window.__nativeClearInterval, window.__nativeDate, window.__nativePerformance, window.__origRaf, window.__origCancelRaf);
        </script>
        <script>${CAPTURE_AGENT}</script>
      `;
      finalHtml = finalHtml.replace(/<head[^>]*>/i, (m) => m + injection);
      if (!finalHtml.includes(injection)) {
        finalHtml = injection + finalHtml;
      }
    }

    const sandboxDomain = import.meta.env.VITE_SANDBOX_DOMAIN;
    let isSettled = false;

    const timeoutId = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        reject(new Error("Sandbox iframe failed to load (timeout after 10 seconds). Check your internet connection."));
      }
    }, 10000);

    if (sandboxDomain) {
      // Remote Sandbox Mode
      const targetSrc = sandboxDomain.startsWith('http') ? sandboxDomain : `https://${sandboxDomain}`;
      
      const onMessage = (e: MessageEvent) => {
        if (e.data?.type === 'sandbox-ready') {
          window.removeEventListener('message', onMessage);
          if (iframe.contentWindow) {
             iframe.contentWindow.postMessage({ type: 'render-sandbox', html: finalHtml }, '*');
          }
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            setTimeout(resolve, 200); 
          }
        }
      };
      
      window.addEventListener('message', onMessage);
      iframe.src = targetSrc;
      
    } else {
      // Local Dev Fallback (srcdoc)
      const onLoad = () => {
        iframe.removeEventListener("load", onLoad);
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          resolve();
        }
      };
      iframe.addEventListener("load", onLoad);
      iframe.srcdoc = finalHtml;
    }
  });
}

function checkIframeMedia(iframe: HTMLIFrameElement): Promise<{ hasFullscreenCanvas: boolean }> {
  return new Promise((resolve) => {
    const win = iframe.contentWindow;
    if (!win) return resolve({ hasFullscreenCanvas: false });
    
    const handler = (e: MessageEvent) => {
      if (e.source !== win) return;
      if (e.data?.type === 'media-checked') {
        window.removeEventListener('message', handler);
        resolve({ hasFullscreenCanvas: e.data.hasFullscreenCanvas });
      }
    };
    window.addEventListener('message', handler);
    win.postMessage({ type: 'check-media' }, '*');
    
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve({ hasFullscreenCanvas: false });
    }, 1500);
  });
}

function requestIframeFrame(
  iframe: HTMLIFrameElement, 
  timeMs: number, 
  mode: 'quick' | 'hq', 
  width: number, 
  height: number
): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const win = iframe.contentWindow;
    if (!win) return reject(new Error("Iframe window unavailable."));
    
    const handler = (e: MessageEvent) => {
      if (e.source !== win) return;
      if (e.data?.type === 'frame-captured') {
        window.removeEventListener('message', handler);
        if (e.data.error) reject(new Error(e.data.error));
        else resolve(e.data.bitmap);
      }
    };
    window.addEventListener('message', handler);
    win.postMessage({ type: 'capture-frame', timeMs, mode, width, height }, '*');
    
    // The very first frame in HQ mode downloads and caches all fonts/images, which can easily take 20-40s on slower networks.
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error("Iframe did not respond to frame capture request."));
    }, 60000);
  });
}

/** Pick a few representative frame indices for duplicate-detection sampling. */
function shouldSampleSignature(frameIndex: number, totalFrames: number): boolean {
  if (totalFrames <= 8) return true;
  const checkpoints = [
    Math.floor(totalFrames * 0.1),
    Math.floor(totalFrames * 0.3),
    Math.floor(totalFrames * 0.5),
    Math.floor(totalFrames * 0.7),
    Math.floor(totalFrames * 0.9),
  ];
  return checkpoints.includes(frameIndex);
}

/** Fast 32-pixel column sample for duplicate-frame detection. */
function canvasSignature(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const w = canvas.width;
  const h = canvas.height;
  const step = Math.max(1, Math.floor(h / 32));
  const data = ctx.getImageData(Math.floor(w / 2), 0, 1, h);
  let sig = "";
  for (let y = 0; y < h; y += step) {
    const base = y * 4;
    sig += data.data[base].toString(16).padStart(2, "0");
    sig += data.data[base + 1].toString(16).padStart(2, "0");
    sig += data.data[base + 2].toString(16).padStart(2, "0");
  }
  return sig;
}

interface Mp4FrameEncoderOpts {
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
}

interface Mp4FrameEncoder {
  addFrame(
    canvas: HTMLCanvasElement,
    frameIndex: number,
    timestampUs: number,
    durationUs: number,
  ): Promise<void>;
  finish(): Promise<Blob>;
  cancel(): void;
}

/** Build an MP4 encoder backed by WebCodecs + mp4-muxer. */
async function createMp4FrameEncoder(opts: Mp4FrameEncoderOpts): Promise<Mp4FrameEncoder> {
  const { width, height, fps, totalFrames } = opts;

  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: "avc",
      width,
      height,
    },
    fastStart: "in-memory",
  });

  let cancelled = false;
  const encoder = new VideoEncoder({
    output(chunk, meta) {
      if (cancelled) return;
      muxer.addVideoChunk(chunk, meta);
    },
    error(e) {
      console.error("VideoEncoder error:", e);
    },
  });

  const bitrateMultiplier = width >= 3840 ? 6 : width >= 2560 ? 4 : width >= 1920 ? 2.5 : 1.5;
  const targetBitrate = Math.round(width * height * fps * 0.07 * bitrateMultiplier);

  encoder.configure({
    codec: "avc1.640033",
    width,
    height,
    bitrate: Math.min(targetBitrate, 120_000_000),
    framerate: fps,
    latencyMode: "realtime",
  });

  const totalDurationUs = Math.round((totalFrames / fps) * 1_000_000);
  let encodedCount = 0;
  const keyframeInterval = fps * 2; // keyframe every 2 seconds

  return {
    async addFrame(canvas, frameIndex, timestampUs, durationUs) {
      if (cancelled) return;
      const bitmap = await createImageBitmap(canvas);
      const frame = new VideoFrame(bitmap, { timestamp: timestampUs, duration: durationUs });
      const isKey = frameIndex % keyframeInterval === 0;
      encoder.encode(frame, { keyFrame: isKey });
      frame.close();
      bitmap.close();
      encodedCount++;
    },
    async finish() {
      await encoder.flush();
      // Pad if needed so duration is correct
      const paddedDuration = Math.max(totalDurationUs, encodedCount > 0 ? totalDurationUs : 0);
      muxer.finalize();
      const { buffer } = target;
      return new Blob([buffer], { type: "video/mp4" });
    },
    cancel() {
      cancelled = true;
      try {
        encoder.close();
      } catch {
        // already closed
      }
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — Studio mode (backend render)
// ─────────────────────────────────────────────────────────────────────────────
export async function renderStudioMp4(
  html: string,
  opts: {
    width: number;
    height: number;
    fps: number;
    durationSec: number;
    zoom?: number;
    panX?: number;
    panY?: number;
    exportScale?: number;
  },
  onProgress: (p: CaptureProgress) => void,
  signal?: CaptureSignal,
): Promise<Blob> {
  onProgress({ stage: "preparing", message: "Uploading to Studio Backend..." });

  const endpoint = "/api/render-async";
  const cancelEndpoint = "/api/cancel";

  let clientJobId = Math.random().toString(36).substring(2, 15);
  if (signal) {
    signal.jobId = clientJobId;
    signal.cancelEndpoint = cancelEndpoint;
  }

  const abortController = new AbortController();
  if (signal) {
    signal.abortController = abortController;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      html,
      fps: opts.fps,
      duration: opts.durationSec,
      width: opts.width,
      height: opts.height,
      zoom: opts.zoom,
      panX: opts.panX,
      panY: opts.panY,
      exportScale: opts.exportScale,
      jobId: clientJobId
    }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    let errorText = "Studio render failed.";
    try {
      const rawText = await response.text();
      try {
        const data = JSON.parse(rawText);
        if (data.error) errorText = data.error;
      } catch {
        errorText = rawText || errorText;
      }
    } catch {
      // Ignore text reading errors
    }
    throw new Error(errorText);
  }

  const data = await response.json();
  const serverJobId = data.jobId; // This is the Smart ID from the Edge Proxy
  if (signal) {
    signal.jobId = serverJobId;
  }

  // Polling Loop
  let consecutiveErrors = 0;
  while (true) {
    if (signal?.cancelled) throw new Error("Capture cancelled.");
    
    try {
      const statusRes = await fetch(`/api/status/${serverJobId}`);
      if (!statusRes.ok) throw new Error(`Status check failed: ${statusRes.status}`);
      const statusData = await statusRes.json();
      consecutiveErrors = 0; // reset on success

      if (statusData.status === 'queued') {
        onProgress({ stage: "preparing", message: `Queue Position: #${statusData.position}` });
      } else if (statusData.status === 'processing') {
        if (statusData.progress && statusData.progress.total > 0) {
          onProgress({ 
            stage: "capturing", 
            current: statusData.progress.current, 
            total: statusData.progress.total, 
            message: "Rendering your video..." 
          });
        } else {
          onProgress({ stage: "capturing", message: "Starting rendering engine..." });
        }
      } else if (statusData.status === 'done') {
        break; // Ready for download!
      } else if (statusData.status === 'error') {
        // EXPLICIT SERVER ERROR: Throw completely outside the loop so we don't retry!
        throw new Error("SERVER_FATAL:" + (statusData.error || "Server render failed."));
      }
    } catch (e: any) {
      if (e.message && e.message.startsWith("SERVER_FATAL:")) {
        throw new Error(e.message.replace("SERVER_FATAL:", "")); // Throw to handleExport instantly
      }
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        throw new Error(`Connection to server lost. Tried 5 times (10 seconds). Details: ${e.message}`);
      }
      console.warn(`Status check transient error (Attempt ${consecutiveErrors}/5):`, e);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }

  if (signal?.cancelled) throw new Error("Capture cancelled.");

  onProgress({ stage: "encoding", message: "Downloading final MP4..." });
  const downloadRes = await fetch(`/api/download/${serverJobId}`);
  if (!downloadRes.ok) throw new Error("Failed to download video");
  return await downloadRes.blob();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — Quick mode (deterministic canvas frame export)
// ─────────────────────────────────────────────────────────────────────────────
export async function recordRealtimeMp4(
  iframe: HTMLIFrameElement,
  opts: { width: number; height: number; fps: number; durationSec: number; zoom?: number; panX?: number; panY?: number; exportScale?: number },
  onProgress: (p: CaptureProgress) => void,
  signal?: CaptureSignal,
): Promise<Blob> {
  const { width, height, fps, durationSec } = opts;
  const zoom = opts.zoom || 1;
  const exportScale = opts.exportScale || 1;
  const panX = opts.panX ?? width / 2;
  const panY = opts.panY ?? height / 2;

  const outW = Math.round(width * exportScale);
  const outH = Math.round(height * exportScale);

  const totalFrames = Math.round(fps * durationSec);
  const frameIntervalMs = 1000 / fps;
  const frameDurationUs = Math.round(1_000_000 / fps);

  onProgress({ stage: "preparing", message: "Warming up canvas engine…" });

  const media = await checkIframeMedia(iframe);
  if (!media.hasFullscreenCanvas) {
    throw new Error(
      "Quick Mode requires a full-screen <canvas>. Use High Quality or Studio mode for DOM animations.",
    );
  }

  const encoder = await createMp4FrameEncoder({ width: outW, height: outH, fps, totalFrames });
  const sigs = new Set<string>();

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (signal?.cancelled) throw new Error("Capture cancelled.");

      const timeMs = i * frameIntervalMs;
      const bitmap = await requestIframeFrame(iframe, timeMs, 'quick', width, height);

      const out = document.createElement("canvas");
      out.width = outW;
      out.height = outH;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("2D context unavailable.");

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, outW, outH);

      const cropW = width / zoom;
      const cropH = height / zoom;
      const cropX = panX - cropW / 2;
      const cropY = panY - cropH / 2;

      ctx.save();
      ctx.scale(outW / cropW, outH / cropH);
      ctx.translate(-cropX, -cropY);
      ctx.drawImage(bitmap, 0, 0, width, height);
      ctx.restore();

      const timestampUs = i * frameDurationUs;
      if (shouldSampleSignature(i, totalFrames)) sigs.add(canvasSignature(out));
      await encoder.addFrame(out, i, timestampUs, frameDurationUs);
      
      bitmap.close();
      onProgress({ stage: "capturing", current: i + 1, total: totalFrames });
    }

    if (sigs.size <= 1 && totalFrames > 4) throw new Error(IDENTICAL_FRAMES_MSG);

    onProgress({ stage: "encoding", message: "Finalizing MP4…" });
    return await encoder.finish();
  } catch (e) {
    encoder.cancel();
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — High Quality mode (Offline DOM Snapshotting)
// ─────────────────────────────────────────────────────────────────────────────

export async function renderFrameSteppedMp4(
  iframe: HTMLIFrameElement,
  opts: { width: number; height: number; fps: number; durationSec: number; zoom?: number; panX?: number; panY?: number; exportScale?: number },
  onProgress: (p: CaptureProgress) => void,
  signal?: CaptureSignal,
): Promise<Blob> {
  const { width, height, fps, durationSec } = opts;
  const zoom = opts.zoom || 1;
  const exportScale = opts.exportScale || 1;

  const outW = Math.round(width * exportScale);
  const outH = Math.round(height * exportScale);

  const totalFrames = Math.round(fps * durationSec);
  const frameIntervalMs = 1000 / fps;
  const frameDurationUs = Math.round(1_000_000 / fps);
  
  const panX = opts.panX ?? width / 2;
  const panY = opts.panY ?? height / 2;

  const encoder = await createMp4FrameEncoder({ width: outW, height: outH, fps, totalFrames });
  onProgress({ stage: "preparing", message: "Capturing DOM frame-by-frame (Offline)…" });
  const sigs = new Set<string>();

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable.");

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (signal?.cancelled) throw new Error("Capture cancelled.");
      
      const timeMs = i * frameIntervalMs;
      const bitmap = await requestIframeFrame(iframe, timeMs, 'hq', width, height);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);

      const cropW = width / zoom;
      const cropH = height / zoom;
      const cropX = panX - cropW / 2;
      const cropY = panY - cropH / 2;

      ctx.save();
      ctx.scale(outW / cropW, outH / cropH);
      ctx.translate(-cropX, -cropY);
      ctx.drawImage(bitmap, 0, 0, width, height);
      ctx.restore();

      if (shouldSampleSignature(i, totalFrames)) sigs.add(canvasSignature(out));
      
      const timestampUs = i * frameDurationUs;
      await encoder.addFrame(out, i, timestampUs, frameDurationUs);
      
      bitmap.close();
      onProgress({ 
        stage: "capturing", 
        current: i + 1, 
        total: totalFrames,
        message: "Rendering local snapshot..." 
      });
    }
    
    if (sigs.size <= 1 && totalFrames > 4) {
      throw new Error(IDENTICAL_FRAMES_MSG);
    }
    
    onProgress({ stage: "encoding", message: "Finalizing MP4…" });
    return await encoder.finish();
  } catch (e) {
    encoder.cancel();
    throw e;
  }
}
