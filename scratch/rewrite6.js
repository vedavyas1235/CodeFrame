import fs from 'fs';

const capturePath = 'src/lib/capture.ts';
let captureCode = fs.readFileSync(capturePath, 'utf8');

// The original signature in capture.ts is:
// export async function renderFrameSteppedMp4(
//   iframe: HTMLIFrameElement,
//   opts: { width: number; height: number; fps: number; durationSec: number; zoom?: number; panX?: number; panY?: number; exportScale?: number },
//   onProgress: (p: CaptureProgress) => void,
//   signal?: CaptureSignal,
// ): Promise<Blob> {

const sigSearch = 'export async function renderFrameSteppedMp4(\n  iframe: HTMLIFrameElement,';
const sigReplace = 'export async function renderFrameSteppedMp4(\n  html: string,';
captureCode = captureCode.replace(sigSearch, sigReplace);

// The body of renderFrameSteppedMp4 starts around line 668:
/*
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
*/

const oldBodyStart = '  const encoder = await createMp4FrameEncoder({ width: outW, height: outH, fps, totalFrames });';
const oldBodyEnd = '}\n';

const startIndex = captureCode.indexOf(oldBodyStart);
const endIndex = captureCode.indexOf(oldBodyEnd, startIndex);

const newBody = `
  // Dynamic Hardware Scaling
  const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 2) : 2;
  const memory = typeof navigator !== 'undefined' ? ((navigator as any).deviceMemory || 4) : 4;
  
  let poolSize = 1;
  if (cores >= 8 && memory >= 8) poolSize = 4;
  else if (cores >= 6 && memory >= 4) poolSize = 3;
  else if (cores >= 4 && memory >= 4) poolSize = 2;

  onProgress({ stage: "preparing", message: \`Spawning \${poolSize} background workers...\` });

  const workers: HTMLIFrameElement[] = [];
  try {
    for (let i = 0; i < poolSize; i++) {
      const frame = document.createElement('iframe');
      frame.style.position = 'absolute';
      frame.style.left = '-9999px';
      frame.style.top = '-9999px';
      frame.style.width = \`\${width}px\`;
      frame.style.height = \`\${height}px\`;
      frame.style.opacity = '0';
      frame.style.pointerEvents = 'none';
      document.body.appendChild(frame);
      await loadIframeWithHtml(frame, html, true);
      workers.push(frame);
    }
  } catch (err) {
    workers.forEach(w => w.remove());
    throw new Error("Failed to spawn worker iframes. " + (err instanceof Error ? err.message : String(err)));
  }

  const encoder = await createMp4FrameEncoder({ width: outW, height: outH, fps, totalFrames });
  onProgress({ stage: "preparing", message: \`Capturing DOM using \${poolSize} parallel threads...\` });
  const sigs = new Set<string>();

  try {
    for (let i = 0; i < totalFrames; i += poolSize) {
      if (signal?.cancelled) throw new Error("Capture cancelled.");

      const framesInChunk = Math.min(poolSize, totalFrames - i);
      const chunkPromises = [];
      
      for (let w = 0; w < framesInChunk; w++) {
        const frameIndex = i + w;
        const timeMs = frameIndex * frameIntervalMs;
        const workerIframe = workers[w];
        chunkPromises.push(
          requestIframeFrame(workerIframe, timeMs, 'hq', width, height).then(bitmap => ({
            frameIndex,
            bitmap,
            timestampUs: frameIndex * frameDurationUs
          }))
        );
      }

      const chunkResults = await Promise.all(chunkPromises);

      for (const result of chunkResults) {
        if (signal?.cancelled) throw new Error("Capture cancelled.");
        
        const out = document.createElement("canvas");
        out.width = outW;
        out.height = outH;
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
        ctx.drawImage(result.bitmap, 0, 0, width, height);
        ctx.restore();

        if (shouldSampleSignature(result.frameIndex, totalFrames)) {
          sigs.add(canvasSignature(out));
        }

        await encoder.addFrame(out, result.frameIndex, result.timestampUs, frameDurationUs);
        result.bitmap.close();
      }

      onProgress({ 
        stage: "capturing", 
        current: Math.min(i + poolSize, totalFrames), 
        total: totalFrames,
        message: \`Rendering local snapshots (\${poolSize} threads)...\` 
      });
    }

    if (sigs.size <= 1 && totalFrames > 4) {
      throw new Error(IDENTICAL_FRAMES_MSG);
    }
    
    onProgress({ stage: "encoding", message: "Finalizing MP4…" });
    const finalBlob = await encoder.finish();
    
    workers.forEach(w => w.remove());
    return finalBlob;

  } catch (e) {
    encoder.cancel();
    workers.forEach(w => w.remove());
    throw e;
  }
`;

if (startIndex !== -1 && endIndex !== -1) {
  captureCode = captureCode.substring(0, startIndex) + newBody + captureCode.substring(endIndex);
  fs.writeFileSync(capturePath, captureCode);
  console.log('Successfully updated capture.ts');
} else {
  console.log('Could not find injection points');
}
