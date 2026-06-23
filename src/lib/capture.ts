// ─────────────────────────────────────────────────────────────────────────────
// TIME SHIM — injected into the iframe to give us synthetic clock control
// ─────────────────────────────────────────────────────────────────────────────
export const TIME_SHIM = `
  window.__VTIME_INSTALLED__ = true;
  var vtime = 0;
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
  window.requestAnimationFrame = function(cb){ rafId++; rafCallbacks.push({id: rafId, cb: cb}); return rafId; };
  window.cancelAnimationFrame = function(id){ rafCallbacks = rafCallbacks.filter(function(x){ return x.id !== id; }); };

  var timeoutCallbacks = []; var timeoutId = 0;
  window.setTimeout = function(cb, delay){
    timeoutId++;
    timeoutCallbacks.push({id: timeoutId, cb: typeof cb === 'function' ? cb : new Function(cb), triggerTime: vtime + (delay || 0)});
    return timeoutId;
  };
  window.clearTimeout = function(id){ timeoutCallbacks = timeoutCallbacks.filter(function(x){ return x.id !== id; }); };

  var intervalCallbacks = []; var intervalId = 0;
  window.setInterval = function(cb, delay){
    intervalId++;
    intervalCallbacks.push({id: intervalId, cb: typeof cb === 'function' ? cb : new Function(cb), interval: delay || 0, nextTime: vtime + (delay || 0)});
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const IDENTICAL_FRAMES_MSG =
  "All captured frames are identical — the animation may not be running. " +
  "Try Studio mode for complex animations, or verify your HTML plays in the preview.";

/** Load HTML into an iframe, optionally injecting the time shim. */
export function loadIframeWithHtml(
  iframe: HTMLIFrameElement,
  html: string,
  needShim: boolean,
): Promise<void> {
  return new Promise((resolve) => {
    const onLoad = () => {
      iframe.removeEventListener("load", onLoad);
      resolve();
    };
    iframe.addEventListener("load", onLoad);

    let finalHtml = html;
    if (needShim) {
      finalHtml = html.replace(/<head[^>]*>/i, (m) => m + "<script>" + TIME_SHIM + "</script>");
      if (finalHtml === html) {
        finalHtml = "<script>" + TIME_SHIM + "</script>" + html;
      }
    }
    iframe.srcdoc = finalHtml;
  });
}

/** Wait for a single rAF paint inside the iframe's document. */
function waitForIframePaint(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    const win = iframe.contentWindow;
    if (!win) return resolve();
    // Use the *real* rAF from before the shim replaced it, if available
    const raf =
      (win as unknown as Record<string, unknown>).__origRaf ??
      win.requestAnimationFrame ??
      ((cb: FrameRequestCallback) => setTimeout(cb, 16));
    (raf as (cb: FrameRequestCallback) => number).call(win, () => resolve());
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

/** Singleton off-screen canvas re-used across calls to avoid GC pressure. */
let _outCanvas: HTMLCanvasElement | null = null;
function getOutCanvas(width: number, height: number): HTMLCanvasElement {
  if (!_outCanvas || _outCanvas.width !== width || _outCanvas.height !== height) {
    _outCanvas = document.createElement("canvas");
    _outCanvas.width = width;
    _outCanvas.height = height;
  }
  return _outCanvas;
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

/** Inspect what the iframe's content looks like. */
function inspectIframeMedia(
  iframe: HTMLIFrameElement,
  _width: number,
  _height: number,
): { fullscreenCanvas: HTMLCanvasElement | null; canvases: HTMLCanvasElement[]; videos: HTMLVideoElement[] } {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return { fullscreenCanvas: null, canvases: [], videos: [] };
    const canvases = Array.from(doc.querySelectorAll("canvas"));
    const videos = Array.from(doc.querySelectorAll("video"));
    for (const c of canvases) {
      const style = doc.defaultView?.getComputedStyle(c);
      if (!style) continue;
      const pos = style.position;
      if (pos === "fixed" || pos === "absolute") {
        return { fullscreenCanvas: c, canvases, videos };
      }
    }
    // Fallback: any canvas covering most of the viewport
    if (canvases.length === 1) return { fullscreenCanvas: canvases[0], canvases, videos };
    return { fullscreenCanvas: null, canvases, videos };
  } catch {
    // cross-origin or unavailable
  }
  return { fullscreenCanvas: null, canvases: [], videos: [] };
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
    latencyMode: "quality",
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

  const response = await fetch("https://vedavyas1235-animateit.hf.space/api/render", {
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
    }),
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

  if (signal?.cancelled) throw new Error("Capture cancelled.");

  onProgress({ stage: "encoding", message: "Downloading final MP4..." });
  return await response.blob();
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

  // Detect if the iframe has a full-screen canvas we can read directly
  const media = inspectIframeMedia(iframe, width, height);
  if (!media.fullscreenCanvas) {
    throw new Error(
      "Quick Mode requires a full-screen <canvas>. Use High Quality or Studio mode for DOM animations.",
    );
  }
  const srcCanvas = media.fullscreenCanvas;

  // Verify the time shim is installed
  const win = iframe.contentWindow as Record<string, unknown> | null;
  if (!win || typeof win["__advanceVTime"] !== "function") {
    throw new Error("Virtual time shim not installed. Quick Mode cannot run.");
  }
  const advanceVTime = win["__advanceVTime"] as (ms: number) => void;

  const out = getOutCanvas(outW, outH);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable.");

  const encoder = await createMp4FrameEncoder({ width: outW, height: outH, fps, totalFrames });
  const sigs = new Set<string>();

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (signal?.cancelled) throw new Error("Capture cancelled.");

      const timeMs = i * frameIntervalMs;
      advanceVTime(timeMs);
      await waitForIframePaint(iframe);

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, outW, outH);

      const cropW = width / zoom;
      const cropH = height / zoom;
      const cropX = panX - cropW / 2;
      const cropY = panY - cropH / 2;

      ctx.save();
      // Map the crop box to the output dimensions
      ctx.scale(outW / cropW, outH / cropH);
      ctx.translate(-cropX, -cropY);

      // The srcCanvas is drawn at its full logical size [0, 0, width, height]
      // The transform will handle the cropping perfectly
      ctx.drawImage(srcCanvas, 0, 0, width, height);
      ctx.restore();

      const timestampUs = i * frameDurationUs;
      if (shouldSampleSignature(i, totalFrames)) sigs.add(canvasSignature(out));
      await encoder.addFrame(out, i, timestampUs, frameDurationUs);
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

async function snapshotIframeToCanvas(
  iframe: HTMLIFrameElement,
  opts: { width: number; height: number; zoom?: number; panX?: number; panY?: number; exportScale?: number },
): Promise<HTMLCanvasElement> {
  const { width, height } = opts;
  const zoom = opts.zoom || 1;
  const exportScale = opts.exportScale || 1;
  const panX = opts.panX ?? width / 2;
  const panY = opts.panY ?? height / 2;

  const outW = Math.round(width * exportScale);
  const outH = Math.round(height * exportScale);
  const doc = iframe.contentDocument;
  if (!doc) throw new Error("Preview iframe is not ready.");

  // Lock dimensions so it snaps correctly
  doc.documentElement.style.width = `${width}px`;
  doc.documentElement.style.height = `${height}px`;
  doc.documentElement.style.overflow = "hidden";
  if (doc.body) {
    doc.body.style.width = `${width}px`;
    doc.body.style.height = `${height}px`;
    doc.body.style.overflow = "hidden";
  }
  iframe.contentWindow?.scrollTo(0, 0);

  let domSnap: ImageBitmap | null = null;
  try {
    const domtoimage = (await import("dom-to-image-more")).default;
    const blob = await domtoimage.toBlob(doc.documentElement, {
      width,
      height,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
      },
      quality: 1.0,
      cacheBust: true,
      bgcolor: null,
    });
    domSnap = await createImageBitmap(blob);
  } catch (err) {
    console.warn("[capture] dom-to-image-more failed:", err);
  }

  const out = getOutCanvas(outW, outH);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);

  const cropW = width / zoom;
  const cropH = height / zoom;
  const cropX = panX - cropW / 2;
  const cropY = panY - cropH / 2;

  ctx.save();
  ctx.scale(outW / cropW, outH / cropH);
  ctx.translate(-cropX, -cropY);

  if (domSnap) {
    ctx.drawImage(domSnap, 0, 0, width, height);
    domSnap.close();
  }

  // Composite live canvas/video overlays on top of the DOM
  const media = inspectIframeMedia(iframe, width, height);
  const drawEl = (el: HTMLCanvasElement | HTMLVideoElement) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    try {
      if (el instanceof HTMLCanvasElement) {
        ctx.drawImage(el, Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height));
      } else {
        const v = el as HTMLVideoElement;
        ctx.drawImage(v, Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height));
      }
    } catch { /* tainted */ }
  };
  media.canvases.forEach(drawEl);
  media.videos.forEach(drawEl);
  
  ctx.restore();
  return out;
}

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
  
  const win = iframe.contentWindow as Record<string, unknown> | null;
  if (!win || typeof win["__advanceVTime"] !== "function") {
    throw new Error("Virtual time shim not installed. High Quality mode requires it.");
  }
  const advanceVTime = win["__advanceVTime"] as (ms: number) => void;

  const encoder = await createMp4FrameEncoder({ width: outW, height: outH, fps, totalFrames });
  onProgress({ stage: "preparing", message: "Capturing DOM frame-by-frame (Offline)…" });
  const sigs = new Set<string>();

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (signal?.cancelled) throw new Error("Capture cancelled.");
      
      const timeMs = i * frameIntervalMs;
      advanceVTime(timeMs);
      await waitForIframePaint(iframe);
      
      const canvas = await snapshotIframeToCanvas(iframe, opts);
      if (shouldSampleSignature(i, totalFrames)) sigs.add(canvasSignature(canvas));
      
      const timestampUs = i * frameDurationUs;
      await encoder.addFrame(canvas, i, timestampUs, frameDurationUs);
      
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

