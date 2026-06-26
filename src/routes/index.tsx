import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, Film, Loader2, RotateCcw, Play, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { Uploader } from "@/components/Uploader";
import { HtmlPreview } from "@/components/HtmlPreview";
import { MethodPicker, type RecordMethod } from "@/components/MethodPicker";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  loadIframeWithHtml,
  recordRealtimeMp4,
  renderFrameSteppedMp4,
  renderStudioMp4,
  type CaptureProgress,
  type CaptureSignal,
} from "@/lib/capture";
import { analyzeHtmlForStudioMode, type HtmlAnalysis } from "@/lib/scanner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CodeFrame — Convert HTML animations to MP4" },
      {
        name: "description",
        content:
          "Upload an HTML animation, preview it, and export a crisp MP4 — all in your browser.",
      },
      { property: "og:title", content: "CodeFrame — HTML to MP4" },
      {
        property: "og:description",
        content: "Turn your HTML/CSS/JS animations into shareable MP4 video.",
      },
    ],
  }),
  component: StudioPage,
});

// Output resolutions — these now change the export rendering scale (deviceScaleFactor),
// while the logical HTML viewport size stays locked to exactly 1920x1080 or 1080x1920.
const RESOLUTIONS = [
  { label: "720p", scale: 2/3 }, // 1280x720
  { label: "1080p", scale: 1 },  // 1920x1080
  { label: "1440p (2K)", scale: 4/3 }, // 2560x1440
] as const;

type Orientation = "landscape" | "portrait";

function StudioPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [resIdx, setResIdx] = useState(1); // default 1080p
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [duration, setDuration] = useState(8);
  const [fps, setFps] = useState(30);
  const [method, setMethod] = useState<RecordMethod>("realtime");
  const [analysis, setAnalysis] = useState<HtmlAnalysis | null>(null);
  const [progress, setProgress] = useState<CaptureProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [outUrl, setOutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasWebCodecs, setHasWebCodecs] = useState<boolean>(true);

  const baseWidth = 1920;
  const baseHeight = 1080;
  const res =
    orientation === "portrait"
      ? { width: baseHeight, height: baseWidth }
      : { width: baseWidth, height: baseHeight };
      
  const exportScale = RESOLUTIONS[resIdx].scale;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const signalRef = useRef<CaptureSignal>({ cancelled: false });
  const viewStateRef = useRef({ zoom: 1, panX: res.width / 2, panY: res.height / 2 });

  // Update view state center when orientation changes so it doesn't get stuck
  useEffect(() => {
    viewStateRef.current = { zoom: 1, panX: res.width / 2, panY: res.height / 2 };
  }, [res.width, res.height]);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.VideoEncoder) {
      setHasWebCodecs(false);
    }
  }, []);

  // Load preview HTML into iframe whenever html changes (no shim for preview)
  useEffect(() => {
    if (!html || !iframeRef.current) return;
    void loadIframeWithHtml(iframeRef.current, html, false);
  }, [html]);

  useEffect(() => {
    return () => {
      if (outUrl) URL.revokeObjectURL(outUrl);
    };
  }, [outUrl]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (signalRef.current.jobId && signalRef.current.cancelEndpoint) {
        navigator.sendBeacon(`${signalRef.current.cancelEndpoint}/${signalRef.current.jobId}`);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const reset = () => {
    setFileName(null);
    setHtml(null);
    setAnalysis(null);
    setOutUrl(null);
    setError(null);
    setProgress(null);
  };

  const totalFrames = Math.round(duration * fps);
  

  function triggerDownload(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleConvert() {
    if (!html || !iframeRef.current) return;

    // Block Quick Mode for complex DOM animations
    if (method === "realtime" && analysis?.requiresStudio) {
      toast.error("Complex animation detected", {
        description: "Quick Mode only supports pure Canvas animations. Please select High Quality or Studio Mode to capture DOM text and CSS.",
        duration: 5000,
      });
      return;
    }

    setBusy(true);
    setError(null);
    setOutUrl(null);
    signalRef.current = { cancelled: false };
    try {
      // Quick mode (realtime) and High Quality (tabcapture) use the synthetic time shim
      // Realtime uses it for deterministic extraction, tabcapture uses it for Time Dilation
      const needShim = method === "realtime" || method === "tabcapture";
      await loadIframeWithHtml(iframeRef.current, html, needShim);

      let mp4: Blob;
      const offlineOpts = {
        width: res.width, height: res.height, fps, durationSec: duration,
        zoom: viewStateRef.current.zoom,
        panX: viewStateRef.current.panX,
        panY: viewStateRef.current.panY,
        exportScale: exportScale
      };

      if (method === "realtime") {
        mp4 = await recordRealtimeMp4(
          iframeRef.current,
          offlineOpts,
          setProgress,
          signalRef.current,
        );
      } else if (method === "tabcapture") {
        mp4 = await renderFrameSteppedMp4(
          iframeRef.current,
          offlineOpts,
          setProgress,
          signalRef.current,
        );
      } else if (method === "studio") {
        mp4 = await renderStudioMp4(
          html,
          { 
            width: res.width, 
            height: res.height, 
            fps, 
            durationSec: duration,
            zoom: viewStateRef.current.zoom,
            panX: viewStateRef.current.panX,
            panY: viewStateRef.current.panY,
            exportScale: exportScale
          },
          setProgress,
          signalRef.current,
        );
      } else {
        throw new Error("Unknown method");
      }
      setProgress({ stage: "done" });
      const url = URL.createObjectURL(mp4);
      setOutUrl(url);
      triggerDownload(url, `${(fileName ?? "render").replace(/\.html?$/i, "")}.mp4`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    signalRef.current.cancelled = true;
    if (signalRef.current.abortController) {
      signalRef.current.abortController.abort();
    }
    if (signalRef.current.jobId && signalRef.current.cancelEndpoint) {
      navigator.sendBeacon(`${signalRef.current.cancelEndpoint}/${signalRef.current.jobId}`);
    }
  }

  const progressPercent = progress?.total
    ? Math.round(((progress.current ?? 0) / progress.total) * 100)
    : progress?.stage === "encoding"
      ? 95
      : 10;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SiteHeader />
      <main className="flex-1 min-h-0 overflow-hidden">
        {!html ? (
          <section className="h-full overflow-y-auto">
            <div className="mx-auto max-w-5xl px-6 py-20">
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">
              HTML → MP4 · in your browser
            </p>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.95]">
              Render your <em className="text-primary not-italic">animations</em>
              <br /> as crisp video.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Drop a self-contained HTML file. Preview it. Export it as a clean MP4 — without ever
              leaving the browser, and without a fuzzy screen recording.
            </p>
            <div className="mt-12">
              <Uploader
                onFile={(name, text) => {
                  setFileName(name);
                  setHtml(text);
                  const result = analyzeHtmlForStudioMode(text);
                  setAnalysis(result);
                  if (result.requiresStudio) {
                    setMethod("studio");
                  }
                }}
              />
            </div>
            <div className="mt-12 grid sm:grid-cols-3 gap-6 text-sm">
              {[
                ["Three capture modes", "Quick auto-routing, frame-stepped, and Tab Capture for complex animations."],
                ["No uploads", "Everything runs locally — your file never leaves your device."],
                ["MP4 out of the box", "H.264 with faststart, ready to share or post."],
              ].map(([t, b]) => (
                <div key={t}>
                  <div className="mb-2 h-px w-8 bg-primary" />
                  <h3 className="font-display text-lg">{t}</h3>
                  <p className="text-muted-foreground mt-1">{b}</p>
                </div>
              ))}
            </div>
            </div>
          </section>
        ) : (
          /* Studio: full-height split panel — both columns scroll independently */
          <section className="h-full grid lg:grid-cols-[1.4fr_1fr] overflow-hidden">
            {/* Left column: preview + output — scrollable */}
            <div className="overflow-y-auto px-5 py-5 space-y-4 border-r border-border/40">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Preview</p>
                  <h2 className="font-display text-2xl truncate">{fileName}</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
                  <RotateCcw className="h-4 w-4 mr-2" /> New file
                </Button>
              </div>
              <HtmlPreview 
                ref={iframeRef} 
                width={res.width} 
                height={res.height} 
                onViewChange={(zoom, panX, panY) => {
                  viewStateRef.current = { zoom, panX, panY };
                }}
              />
              <p className="text-xs text-muted-foreground">
                Preview rendered at{" "}
                <span className="text-foreground">
                  {res.width}×{res.height}
                </span>{" "}
                · scaled to fit
              </p>

              {outUrl && (
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Film className="h-4 w-4" />
                    <span className="text-sm font-medium">Your MP4 is ready</span>
                  </div>
                  <video
                    src={outUrl}
                    controls
                    className="w-full rounded-lg border border-border bg-black"
                  />
                  <Button
                    className="w-full"
                    onClick={() =>
                      triggerDownload(
                        outUrl,
                        `${(fileName ?? "render").replace(/\.html?$/i, "")}.mp4`,
                      )
                    }
                  >
                    <Download className="h-4 w-4 mr-2" /> Download MP4
                  </Button>
                </div>
              )}
            </div>

            {/* Right column: settings — scrollable sidebar */}
            <aside className="h-full overflow-y-auto px-5 py-5 space-y-4">
              {!hasWebCodecs && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="mt-1 text-xs">
                    Your browser does not support local video encoding (WebCodecs). Quick Mode and High Quality Mode will fail. Please use <strong>Studio Mode</strong> or switch to Chrome/Edge.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <h3 className="font-display text-xl mb-3">Capture mode</h3>
                <MethodPicker value={method} onChange={setMethod} hasWebCodecs={hasWebCodecs} />
              </div>

              <div className="space-y-5 rounded-xl border border-border bg-card p-5">
                {/* Resolution */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Resolution
                  </Label>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {RESOLUTIONS.map((r, i) => {
                      const isDisabled = method !== "studio" && (r.label.includes("2K") || r.label.includes("4K"));
                      return (
                        <button
                          key={r.label}
                          id={`res-btn-${r.label}`}
                          disabled={isDisabled}
                          onClick={() => setResIdx(i)}
                          className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                            i === resIdx
                              ? "border-primary bg-primary/10 text-foreground"
                              : isDisabled
                              ? "border-border/50 text-muted-foreground/30 cursor-not-allowed"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                          title={isDisabled ? "Available in Studio Mode" : ""}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Orientation */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Orientation
                  </Label>
                  <div className="mt-2 flex gap-2">
                    <button
                      id="orient-landscape"
                      onClick={() => setOrientation("landscape")}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        orientation === "landscape"
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Landscape
                    </button>
                    <button
                      id="orient-portrait"
                      onClick={() => setOrientation("portrait")}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        orientation === "portrait"
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Portrait
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Output: <span className="text-foreground tabular-nums">{Math.round(res.width * exportScale)}×{Math.round(res.height * exportScale)}</span>
                  </p>
                </div>

                {/* Duration */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Duration
                    </Label>
                    <span className="text-sm tabular-nums">{duration}s</span>
                  </div>
                  <Slider
                    value={[duration]}
                    onValueChange={(v) => setDuration(v[0])}
                    min={1}
                    max={60}
                    step={1}
                    className="mt-3"
                  />
                </div>

                {/* Frame rate */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Frame rate
                  </Label>
                  <div className="mt-2 flex gap-2">
                    {[24, 30, 60].map((f) => (
                      <button
                        key={f}
                        id={`fps-btn-${f}`}
                        onClick={() => setFps(f)}
                        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                          f === fps
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f} fps
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Warnings */}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {analysis?.requiresStudio && method !== "studio" && (
                <Alert className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <AlertDescription>
                    <strong className="font-semibold block mb-1">Studio Mode Recommended</strong>
                    This animation uses external assets or complex JS libraries:
                    <ul className="list-disc pl-5 mt-1 opacity-90 text-xs">
                      {analysis.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                    Switching to Studio mode is highly recommended to avoid CORS errors and guarantee perfectly smooth rendering.
                  </AlertDescription>
                </Alert>
              )}

              {/* Progress */}
              {busy && progress && (
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="capitalize">{progress.stage}</span>
                    {progress.total ? (
                      <span className="text-muted-foreground tabular-nums">
                        · frame {progress.current}/{progress.total}
                      </span>
                    ) : progress.message ? (
                      <span className="text-muted-foreground">· {progress.message}</span>
                    ) : null}
                  </div>
                  {(progress.droppedFrames ?? 0) > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {progress.droppedFrames} late frame(s). Try a lower resolution or 30fps for
                      smoother output.
                    </p>
                  )}
                  <Progress value={progressPercent} />
                  
                  {method !== "studio" && (
                    <div className="flex items-start gap-2 text-amber-500 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 mt-4 animate-pulse">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium leading-relaxed">
                        Keep this tab visible! Browsers will pause the export if you switch to another tab.
                      </p>
                    </div>
                  )}

                  <Button variant="ghost" size="sm" className="w-full mt-2" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              )}

              <Button
                id="convert-btn"
                size="lg"
                className="w-full"
                onClick={handleConvert}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rendering…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" /> Convert to MP4
                  </>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                All encoding happens in your browser. No uploads.
              </p>
            </aside>
          </section>
        )}
      </main>
      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Built with care · Runs entirely in your browser
      </footer>
    </div>
  );
}
