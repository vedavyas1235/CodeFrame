<div align="center">

<br/>

<img src="public/favicon.svg" alt="CodeFrame Logo" width="100" height="100" style="border-radius: 50%"/>

<br/>
<br/>

# CodeFrame

### Turn your HTML animations into crisp, shareable MP4 videos — right in your browser.

<br/>

[![Live App](https://img.shields.io/badge/Live%20App-CodeFrame-6d28d9?style=for-the-badge&logo=googlechrome&logoColor=white)](https://codeframe.workers.dev)
[![Studio Backend](https://img.shields.io/badge/Studio%20Backend-Online-22c55e?style=for-the-badge&logo=huggingface&logoColor=white)](https://huggingface.co/spaces/vedavyas1235/animateit)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](LICENSE)

<br/>

```
Upload an HTML file → Preview it → Export a perfect MP4
No screen recording. No uploads. No fuss.
```

<br/>

---

</div>

## ✦ What is CodeFrame?

**CodeFrame** is a browser-based studio for converting self-contained HTML animations into professional-quality MP4 videos. 

You write an animation in HTML. You drop it into CodeFrame. You get back a pixel-perfect video — without ever leaving your browser, without a fuzzy screen recording, and without sending your work to anyone's server (unless you choose to).

It was built to solve a simple problem: **sharing web animations as video has always been painful.** Screen recorders introduce cursor artifacts, frame drops, and blurry compression. CodeFrame eliminates all of that by rendering your animation deterministically, frame by frame, at the exact resolution you choose.

<br/>

---

## ✦ How It Works

CodeFrame offers **three capture modes**, each designed for a different use case.

<br/>

### ⚡ Quick Mode
> *Best for: Pure graphics and visual effects*

When you upload a graphics-based animation, Quick Mode takes over the internal clock and renders every frame at exactly the right timestamp — deterministically and instantly. There are no dropped frames, no lag, and no dependency on your machine's performance. The animation is stepped forward frame-by-frame in a controlled loop and encoded directly to MP4.

**Limitation:** Quick Mode only works with animations drawn as pure mathematical graphics. Standard text and complex page layouts will not appear in the output.

<br/>

### 🎞️ High Quality Mode
> *Best for: Standard text, custom fonts, complex layouts — all offline*

High Quality Mode flawlessly captures heavy elements like text, custom styling, and layered layouts. It works by taking a high-fidelity visual snapshot of the page for every single frame, compiling those snapshots into an MP4 entirely in your browser. Your file never leaves your device.

**Limitation:** Because every frame is individually rendered, the export takes significantly longer than Quick Mode. Keep the tab visible during export — browsers pause rendering on hidden tabs.

<br/>

### 👑 Studio Mode
> *Best for: Heavy workloads, external fonts, professional-grade exports*

Studio Mode sends your animation to a dedicated cloud-based rendering pipeline that processes the animation at maximum speed with perfect frame timing. It supports external fonts, heavy third-party libraries, and any feature that requires a professional environment. The output is always silky-smooth regardless of how complex the animation is.

**Limitation:** Requires an internet connection to reach the rendering servers. Complex 3D graphics support is actively being expanded.

<br/>

---

## ✦ Using CodeFrame

```
Step 1 — Drop your HTML file
```
Drag and drop (or click to browse) a self-contained `.html` file onto the upload area. For best results, inline your CSS, JavaScript, and any image assets directly into the HTML file.

```
Step 2 — Preview your animation
```
The animation plays immediately in the preview window at its native 1920×1080 resolution, scaled to fit your screen. Use the **Crop Box** slider beneath the preview to zoom in on a specific region — the export will capture exactly that region.

```
Step 3 — Choose your settings
```
- **Capture Mode** — Quick, High Quality, or Studio (auto-suggested based on your file)
- **Resolution** — 720p, 1080p (Quick/HQ), or up to 2K (Studio)
- **Orientation** — Landscape or Portrait
- **Duration** — 1 to 60 seconds
- **Frame Rate** — 24, 30, or 60 fps

```
Step 4 — Export
```
Click **Convert to MP4**. A progress bar tracks the render. When complete, the video previews inline and downloads automatically as an H.264 MP4 file, ready to share anywhere.

<br/>

---

## ✦ The Crop Box

One of CodeFrame's most powerful features is its **Crop Box** — a visual region selector in the preview panel.

By default the crop box covers the entire 1920×1080 canvas. Drag the slider to zoom in, then drag the crop overlay to reposition it over the area of your animation you want to capture. The export engine will map that exact region — and only that region — to the output video, scaled up to your chosen resolution.

This is especially useful for:
- Exporting a close-up of a specific animation element
- Cropping out a large canvas to focus on one character or effect
- Creating portrait-format clips from a landscape animation

<br/>

---

## ✦ Writing HTML Animations for CodeFrame

**For Quick Mode**, your animation must draw to a `<canvas>` element:
```html
<!DOCTYPE html>
<html>
<body style="margin:0; background:#000;">
  <canvas id="c" style="position:fixed; inset:0; width:100vw; height:100vh;"></canvas>
  <script>
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    canvas.width = 1920; canvas.height = 1080;

    function draw(t) {
      ctx.clearRect(0, 0, 1920, 1080);
      ctx.fillStyle = `hsl(${t / 10}, 80%, 50%)`;
      ctx.fillRect(0, 0, 1920, 1080);
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  </script>
</body>
</html>
```

**For High Quality / Studio Mode**, any HTML layout works:
```html
<!DOCTYPE html>
<html>
<head>
<style>
  body { margin:0; background:#0f0f0f; display:flex; align-items:center; justify-content:center; height:100vh; }
  h1 { color:white; font-size:120px; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.1); } }
</style>
</head>
<body>
  <h1>Hello, CodeFrame</h1>
</body>
</html>
```

> **Tip:** Use the **Quick Mode Prompt** button in the navigation bar for a pre-written AI prompt you can paste into any LLM to generate CodeFrame-compatible animations instantly.

<br/>

---

## ✦ Project Structure

```
CodeFrame/
│
├── public/                      # Static assets served to the browser
│   ├── favicon.svg              # Circular brand icon
│   ├── logo_codeframe_2.mp4     # Animated nav logo
│   └── logo_animation.mp4       # Original logo animation
│
├── src/
│   ├── routes/
│   │   ├── index.tsx            # Main studio page — upload, preview, export UI
│   │   ├── about.tsx            # About / How It Works page
│   │   └── __root.tsx           # App shell, head tags, global layout
│   │
│   ├── components/
│   │   ├── HtmlPreview.tsx      # Iframe preview with zoom/pan crop box
│   │   ├── MethodPicker.tsx     # Quick / High Quality / Studio mode selector
│   │   ├── Uploader.tsx         # Drag-and-drop HTML file uploader
│   │   ├── SiteHeader.tsx       # Navigation bar with logo and links
│   │   └── PromptInfo.tsx       # Quick Mode AI prompt popup dialog
│   │
│   ├── lib/
│   │   ├── capture.ts           # Core export engine (all three modes)
│   │   ├── scanner.ts           # HTML analysis — recommends the right mode
│   │   ├── webcodecs-mp4.ts     # MP4 encoding via WebCodecs
│   │   └── utils.ts             # Shared utilities
│   │
│   └── styles.css               # Global design tokens and base styles
│
├── server/                      # SSR server entry for Cloudflare Workers
├── vite.config.ts               # Build configuration
└── wrangler.jsonc               # Cloudflare Workers deployment config
```

<br/>

---

## ✦ Capture Modes at a Glance

| Feature | Quick Mode | High Quality | Studio Mode |
|---|:---:|:---:|:---:|
| Pure graphics & visual effects | ✅ | ✅ | ✅ |
| Standard text & complex layouts | ❌ | ✅ | ✅ |
| External fonts & heavy libraries | ❌ | ⚠️ Slower rendering | ✅ |
| Runs entirely offline | ✅ | ✅ | ❌ |
| Export speed | 🚀 Instant | 🐢 Slow | ⚡ Fast |
| Max resolution | 1080p | 1080p | 2K |
| Recommended for | Simple graphics | Complex designs | Professional work |

<br/>

---

## ✦ About

CodeFrame is an independent project built with the goal of making web animation exports effortless. It does not require an account, does not store your files, and does not monetize your data.

The project is under active development. Studio Mode's 3D/WebGL backend support is being expanded, and a job queue system for large renders is planned.

---

<div align="center">

<br/>

**Built with care · Runs entirely in your browser**

<br/>

</div>
