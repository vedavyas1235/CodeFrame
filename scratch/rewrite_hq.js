import fs from 'fs';

const capturePath = 'src/lib/capture.ts';
let captureCode = fs.readFileSync(capturePath, 'utf8');

// 1. Change renderFrameSteppedMp4 signature
captureCode = captureCode.replace(
  'export async function renderFrameSteppedMp4(\n  iframe: HTMLIFrameElement,',
  'export async function renderFrameSteppedMp4(\n  html: string,'
);

// 2. Add dynamic thread scaling and hidden iframe logic
const newHqLogic = `
  const panX = opts.panX ?? width / 2;
  const panY = opts.panY ?? height / 2;

  // Dynamic Hardware Scaling
  // HardwareConcurrency is typically 2-16 cores. DeviceMemory is 2-8+ GB.
  const cores = navigator.hardwareConcurrency || 2;
  const memory = (navigator as any).deviceMemory || 4;
  
  let poolSize = 1;
  if (cores >= 8 && memory >= 8) poolSize = 4;
  else if (cores >= 6 && memory >= 4) poolSize = 3;
  else if (cores >= 4 && memory >= 4) poolSize = 2;
  // If memory < 4GB or cores <= 2, strictly stick to 1 thread to avoid OOM

  onProgress({ stage: "preparing", message: \`Spawning \${poolSize} background workers...\` });

  // Spawn hidden iframes
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
    // Cleanup on failure
    workers.forEach(w => w.remove());
    throw new Error("Failed to spawn worker iframes. " + (err instanceof Error ? err.message : String(err)));
  }

  const encoder = await createMp4FrameEncoder({ width: outW, height: outH, fps, totalFrames });
  onProgress({ stage: "preparing", message: \`Capturing DOM using \${poolSize} parallel threads...\` });
  const sigs = new Set<string>();

  try {
    for (let i = 0; i < totalFrames; i += poolSize) {
      if (signal?.cancelled) throw new Error("Capture cancelled.");

      // Calculate how many frames are left in this chunk
      const framesInChunk = Math.min(poolSize, totalFrames - i);
      
      // Dispatch requests to workers in parallel
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

      // Wait for all workers to finish their frame
      const chunkResults = await Promise.all(chunkPromises);

      // Encode sequentially to preserve video order
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
        message: \`Rendering frames \${i} to \${i + framesInChunk - 1} (\${poolSize} threads)...\` 
      });
    }

    if (sigs.size <= 1 && totalFrames > 4) {
      throw new Error(IDENTICAL_FRAMES_MSG);
    }
    
    onProgress({ stage: "encoding", message: "Finalizing MP4..." });
    const finalBlob = await encoder.finish();
    
    // Cleanup workers on success
    workers.forEach(w => w.remove());
    return finalBlob;

  } catch (e) {
    encoder.cancel();
    // Cleanup workers on failure
    workers.forEach(w => w.remove());
    throw e;
  }
}
`;

const oldHqStart = captureCode.indexOf('  const panX = opts.panX ?? width / 2;');
const oldHqEnd = captureCode.indexOf('}\n\n', oldHqStart);

if (oldHqStart !== -1 && oldHqEnd !== -1) {
  captureCode = captureCode.substring(0, oldHqStart) + newHqLogic;
  fs.writeFileSync(capturePath, captureCode);
  console.log('Successfully updated capture.ts');
} else {
  console.log('Could not find injection points');
}
