import fs from 'fs';

const capturePath = 'src/lib/capture.ts';
let captureCode = fs.readFileSync(capturePath, 'utf8');

// The original signature in capture.ts is:
// export async function renderFrameSteppedMp4(
//   iframe: HTMLIFrameElement,
const sigSearch = 'export async function renderFrameSteppedMp4(\n  iframe: HTMLIFrameElement,';
const sigReplace = 'export async function renderFrameSteppedMp4(\n  html: string,';
captureCode = captureCode.replace(sigSearch, sigReplace);


const oldBodyStart = '  const encoder = await createMp4FrameEncoder({ width: outW, height: outH, fps, totalFrames });\n  onProgress({ stage: "preparing", message: "Capturing DOM frame-by-frame (Offline)…" });\n  const sigs = new Set<string>();';
const oldBodyEnd = '  } catch (e) {\n    encoder.cancel();\n    throw e;\n  }\n}';

const startIndex = captureCode.indexOf(oldBodyStart);
const endIndex = captureCode.indexOf(oldBodyEnd, startIndex) + oldBodyEnd.length;

if (startIndex === -1) {
    console.log("Could not find start index");
    process.exit(1);
}
if (endIndex <= startIndex) {
    console.log("Could not find end index");
    process.exit(1);
}

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
}
`;

captureCode = captureCode.substring(0, startIndex) + newBody + captureCode.substring(endIndex);
fs.writeFileSync(capturePath, captureCode);
console.log('Successfully updated capture.ts');
