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
            A lightning-fast, entirely offline engine optimized for rendering pure graphics and visual effects.
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
                Standard text and complex page layouts may not be visible in the final video. It only captures raw visual graphics.
              </div>
            </div>
          </Section>

          <Section title="2 · High Quality Mode" tag="Offline · High Fidelity">
            A robust offline rendering method designed to flawlessly capture standard text, custom fonts, and complex layouts that Quick Mode might miss.
            <div className="mt-4 space-y-4">
              <div>
                <strong className="text-foreground text-sm block mb-1">Features</strong>
                <ul className="space-y-1 text-sm list-disc pl-5">
                  <li>Captures standard text, fonts, and styling perfectly.</li>
                  <li>Requires zero screen recording or permission prompts.</li>
                  <li>Runs entirely offline.</li>
                </ul>
              </div>
              <div className="bg-muted/50 border border-border/40 rounded-lg p-3 text-sm">
                <strong className="text-foreground block mb-1">Important Limitations & Security</strong>
                <ul className="list-disc pl-5 mt-2 space-y-1.5 text-muted-foreground">
                  <li>
                    <strong className="text-foreground/90 font-medium">No External Scripts:</strong> To protect your device, this mode runs in a strict security sandbox. External CDNs (like GSAP or Anime.js) are instantly blocked. All code MUST be inline Vanilla JS/CSS.
                  </li>
                  <li>
                    <strong className="text-foreground/90 font-medium">No CSS Transitions:</strong> Because time is manually frozen during capture, CSS <code className="text-[10px] bg-background/50 border border-border/50 px-1 py-0.5 rounded">transition</code> animations will freeze. Use <code className="text-[10px] bg-background/50 border border-border/50 px-1 py-0.5 rounded">requestAnimationFrame</code> instead.
                  </li>
                  <li>
                    The rendering process takes significantly longer, and the live preview may appear choppy during export.
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          <Section title="3 · Studio Mode" tag="Cloud · Professional">
            Our flagship cloud-based rendering pipeline designed for heavy, professional workloads and maximum visual fidelity.
            <div className="mt-4 space-y-4">
              <div>
                <strong className="text-foreground text-sm block mb-1">Features</strong>
                <ul className="space-y-1 text-sm list-disc pl-5">
                  <li>Flawless pixel-perfect rendering of any complex animation.</li>
                  <li>Handles external fonts, heavy libraries, and complex overlays with ease.</li>
                  <li>Guarantees 60fps without any visual rounding errors.</li>
                </ul>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <strong className="text-foreground block mb-1">Note / Limitations</strong>
                <p className="mb-2">Since we are consciously putting effort into updating our backend systems, complex 3D graphics are currently not supported in Studio Mode. Please do not attempt to export heavy 3D scenes through Studio.</p>
                <ul className="list-disc pl-5">
                  <li>No YouTube embeds.</li>
                  <li>No audio extraction.</li>
                </ul>
              </div>
            </div>
          </Section>
        </div>

        <div className="mt-16 rounded-2xl border border-border bg-card p-8">
          <h3 className="font-display text-2xl">Tips for best results</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Keep all your styling and scripts together in the same file.</li>
            <li>Embed images directly as data to avoid loading warnings.</li>
            <li>Stick to ~20 seconds at 30fps for High Quality mode to keep export times fast.</li>
            <li>Set the background colour — transparent areas will render black in the final MP4.</li>
            <li>
              For custom web fonts loaded from external sources, embedding the font directly into the file is the most reliable approach.
            </li>
            <li>
              If Quick mode misses something (e.g., a specific visual effect), switch to High Quality Mode — it records the exact visual output as seen on screen.
            </li>
            <li className="text-primary font-medium">
              Please refer to the AI Prompt structures for High Quality and Quick Mode (available in the top navigation bar) to get the best output and formatting when generating code with AI.
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
