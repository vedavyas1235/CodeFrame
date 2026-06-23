import { ArrayBufferTarget, Muxer } from "mp4-muxer";

type Mp4FrameEncoderOptions = {
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  bitrate?: number;
};

type FrameSource = HTMLCanvasElement | OffscreenCanvas | ImageBitmap | VideoFrame;

const MICROSECONDS_PER_SECOND = 1_000_000;

async function pickSupportedAvcConfig(
  options: Mp4FrameEncoderOptions,
): Promise<VideoEncoderConfig> {
  if (typeof window === "undefined" || !("VideoEncoder" in window) || !("VideoFrame" in window)) {
    throw new Error("MP4 encoding needs WebCodecs. Please use a recent Chrome or Edge browser.");
  }

  const bitrate =
    options.bitrate ??
    // Higher floor (8 Mbps) and multiplier (0.15) for sharper output.
    // At 720p/30fps this gives ~8Mbps (was 3.3Mbps — too low for motion).
    // At 1080p/60fps this gives ~18.7Mbps — high quality, modern decoders handle it fine.
    Math.max(8_000_000, Math.round(options.width * options.height * options.fps * 0.15));

  // Try a few common H.264 profiles. Hardware first, software as fallback.
  const accelModes: VideoEncoderConfig["hardwareAcceleration"][] = [
    "prefer-hardware",
    "no-preference",
    "prefer-software",
  ];
  const codecCandidates = ["avc1.640028", "avc1.64002a", "avc1.4d4028", "avc1.42001f"];

  for (const accel of accelModes) {
    for (const codec of codecCandidates) {
      const config: VideoEncoderConfig = {
        codec,
        width: options.width,
        height: options.height,
        bitrate,
        framerate: options.fps,
        latencyMode: "realtime", // disables B-frames / reordering → simpler timestamps
        hardwareAcceleration: accel,
        avc: { format: "avc" },
      };
      try {
        const support = await VideoEncoder.isConfigSupported(config);
        if (support.supported && support.config) return support.config;
      } catch {
        /* try next */
      }
    }
  }

  throw new Error(
    "This browser cannot encode H.264 MP4 at the selected resolution. Try Chrome/Edge or 720p.",
  );
}

export type Mp4FrameEncoder = {
  addFrame: (source: FrameSource, index: number, timestampUs?: number, durationUs?: number) => Promise<void>;
  finish: () => Promise<Blob>;
  cancel: () => void;
};

export async function createMp4FrameEncoder(
  options: Mp4FrameEncoderOptions,
): Promise<Mp4FrameEncoder> {
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: "avc",
      width: options.width,
      height: options.height,
      frameRate: options.fps,
    },
    // in-memory writes a single, correct, non-fragmented MP4 with proper duration
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });

  const frameDuration = Math.round(MICROSECONDS_PER_SECOND / options.fps);
  let encoderError: Error | null = null;
  let outputCount = 0;
  let cancelled = false;

  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      try {
        muxer.addVideoChunk(chunk, meta);
        outputCount++;
      } catch (e) {
        encoderError = e instanceof Error ? e : new Error(String(e));
      }
    },
    error: (error) => {
      encoderError = error instanceof Error ? error : new Error(String(error));
    },
  });

  encoder.configure(await pickSupportedAvcConfig(options));

  // ~1s GOP for cheap seek/recovery.
  const keyframeInterval = Math.max(options.fps, 1);

  return {
    async addFrame(source: FrameSource, index: number, timestampUs?: number, durationUs?: number) {
      if (cancelled) throw new Error("Encoding cancelled.");
      if (encoderError) throw encoderError;

      const timestamp = timestampUs ?? index * frameDuration;
      const duration = durationUs ?? frameDuration;
      const frame =
        source instanceof VideoFrame
          ? source
          : new VideoFrame(source, {
              timestamp,
              duration,
              alpha: "discard",
            });

      try {
        encoder.encode(frame, { keyFrame: index % keyframeInterval === 0 });
      } finally {
        frame.close();
      }

      // Backpressure: don't let the encode queue balloon.
      let guard = 0;
      while (encoder.encodeQueueSize > 4 && guard++ < 500) {
        await new Promise((r) => setTimeout(r, 4));
        if (cancelled) throw new Error("Encoding cancelled.");
        if (encoderError) throw encoderError;
      }
    },
    async finish() {
      if (encoderError) throw encoderError;
      await encoder.flush();
      if (encoderError) throw encoderError;
      encoder.close();
      muxer.finalize();

      if (outputCount === 0) {
        throw new Error("Encoder produced no frames. The capture may have been blocked.");
      }
      return new Blob([target.buffer], { type: "video/mp4" });
    },
    cancel() {
      cancelled = true;
      try {
        encoder.close();
      } catch {
        /* ignore */
      }
    },
  };
}
