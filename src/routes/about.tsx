import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About CodeFrame — How HTML to MP4 conversion works" },
      {
        name: "description",
        content:
          "How CodeFrame converts HTML, CSS, and JavaScript animations into MP4 video using three browser-based capture modes.",
      },
      { property: "og:title", content: "About CodeFrame" },
      {
        property: "og:description",
        content: "Three capture modes, all running locally in your browser. No uploads.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">About</p>
        <h1 className="font-display text-5xl leading-tight">A studio for HTML animations.</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          You write beautiful animations in HTML, CSS, and JavaScript. Sharing them as video usually
          means a blurry screen recording. CodeFrame fixes that — pixel-aligned, deterministic, and
          local to your machine.
        </p>

        <div className="mt-14 space-y-10">
          <Section title="1 · Quick Mode" tag="Local · Fast">
            A lightning-fast, entirely offline engine designed specifically for canvas-based animations.
            <div className="mt-4 space-y-4">
              <div>
                <strong className="text-foreground text-sm block mb-1">Features</strong>
                <ul className="space-y-1 text-sm list-disc pl-5">
                  <li>Incredibly fast exports.</li>
                  <li>Immune to browser lag or frame drops.</li>
                  <li>Perfect 60fps output.</li>
                </ul>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <strong className="text-foreground block mb-1">Note / Limitations</strong>
                HTML text and DOM elements will NOT be visible in the final video. It only captures what is drawn mathematically inside a pure `&lt;canvas&gt;`.
              </div>
            </div>
          </Section>

          <Section title="2 · High Quality Mode" tag="Offline · HTML/CSS">
            A robust offline snapshotting engine designed to capture complex HTML, CSS, and SVG elements that Quick Mode cannot see.
            <div className="mt-4 space-y-4">
              <div>
                <strong className="text-foreground text-sm block mb-1">Features</strong>
                <ul className="space-y-1 text-sm list-disc pl-5">
                  <li>Captures DOM elements, standard text, and CSS styles perfectly.</li>
                  <li>Requires zero screen recording or permission prompts.</li>
                  <li>Runs entirely offline.</li>
                </ul>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <strong className="text-foreground block mb-1">Note / Limitations</strong>
                The rendering process takes significantly longer. Because it uses a completely different frame-by-frame snapshot mechanism, the animations during the live preview may appear frozen or comparatively not as smooth as native playback.
              </div>
            </div>
          </Section>

          <Section title="3 · Studio Mode" tag="Cloud · Professional">
            A powerful cloud-based rendering pipeline running on a headless Chromium GPU compositor for professional-grade exports.
            <div className="mt-4 space-y-4">
              <div>
                <strong className="text-foreground text-sm block mb-1">Features</strong>
                <ul className="space-y-1 text-sm list-disc pl-5">
                  <li>Flawless pixel-perfect rendering of any complex HTML/JS/CSS animation.</li>
                  <li>Handles external fonts, heavy libraries, and complex DOM overlays with ease.</li>
                  <li>Guarantees 60fps without canvas rounding errors.</li>
                </ul>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <strong className="text-foreground block mb-1">Note / Limitations</strong>
                Since we are consciously putting effort into updating the backend models, 3D animations (WebGL/Three.js) are currently not supported in Studio Mode. Please do not attempt to export 3D canvases through Studio.
              </div>
            </div>
          </Section>
        </div>

        <div className="mt-16 rounded-2xl border border-border bg-card p-8">
          <h3 className="font-display text-2xl">Tips for best results</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Inline your CSS and JavaScript in the same HTML file.</li>
            <li>Embed images as data URIs to avoid CORS warnings.</li>
            <li>Stick to ~20 seconds at 30fps for the High Quality (frame-stepped) mode.</li>
            <li>Set the body background colour — transparent areas render black in MP4.</li>
            <li>
              For custom web fonts loaded from Google Fonts or similar CDNs, Quick mode waits for
              fonts to load before the first frame — but embedding the font as a base64 data URI in
              a <code>&lt;style&gt;</code> tag is the most reliable approach.
            </li>
            <li>
              If Quick mode misses something (e.g., a CSS filter effect or a shader), switch to Tab
              Capture — it records the browser's real composited output.
            </li>
          </ul>
        </div>

        <div className="mt-12">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline">
            Back to the studio <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  tag,
  children,
}: {
  title: string;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl">{title}</h2>
        <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 rounded-full px-2 py-0.5 shrink-0">
          {tag}
        </span>
      </div>
      <p className="mt-3 text-muted-foreground">{children}</p>
    </div>
  );
}
