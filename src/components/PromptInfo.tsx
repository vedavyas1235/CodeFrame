import { useState } from "react";
import { Info, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PROMPT_TEXT = `### CRITICAL RENDERING CONSTRAINTS FOR VIDEO EXPORT
This HTML file will be fed into a "Canvas Extractor" engine to be rendered into an MP4 video. To ensure the text and graphics are captured successfully, you MUST adhere to the following strict rules:

1. **PURE CANVAS ONLY**: The entire visual output MUST be rendered inside a single, full-screen \`<canvas>\` element. 
2. **NO HTML/DOM TEXT**: You are strictly forbidden from using HTML tags (like \`<h1>\`, \`<div>\`, \`<span>\`, \`<p>\`, etc.) to display text, titles, or UI elements. 
3. **DRAW TEXT TO CANVAS**: Any text requested in the prompt must be drawn mathematically onto the canvas using \`CanvasRenderingContext2D.fillText()\` (for 2D canvas) or rendered as a texture (if using WebGL/Three.js).
4. **FULL SCREEN**: The \`<canvas>\` must be styled to cover the entire viewport (\`position: fixed; inset: 0; width: 100vw; height: 100vh;\`). 
5. **NO EXTERNAL ASSETS**: Do not load external fonts or images that might cause cross-origin (CORS) or loading delays. If you need a specific font style, rely on standard system fonts (e.g., \`Arial\`, \`sans-serif\`) within your \`ctx.font\` declaration.
6. **SINGLE HTML FILE**: All HTML, CSS, and JavaScript MUST be contained within a single standalone \`index.html\` file. Do not output separate \`.css\` or \`.js\` files.

If you use HTML elements for text, the video exporter will not see them and the final video will be missing the text. Everything must exist as pixels inside the canvas.`;

export function PromptInfo() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PROMPT_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <Info className="w-4 h-4" />
          <span>Quick Mode Prompt</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background border-border shadow-2xl sm:rounded-2xl flex flex-col max-h-[85vh]">
        
        {/* Header section */}
        <div className="px-6 py-5 border-b border-border/40 bg-muted/20 flex-none">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <DialogTitle className="text-xl font-display">AI Prompt for Quick Mode</DialogTitle>
              </div>
              
              <Button 
                size="sm" 
                onClick={handleCopy}
                className={`gap-2 transition-all duration-300 ${copied ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Prompt
                  </>
                )}
              </Button>
            </div>
            <DialogDescription className="mt-3 text-[15px] leading-relaxed max-w-[90%]">
              Appending this prompt to your AI instructions (ChatGPT, Claude, etc.) forces the AI to draw all text mathematically onto the canvas. This guarantees your animations are instantly compatible with Quick Mode.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Scrollable code area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar bg-zinc-950 dark:bg-zinc-950/80">
          <pre className="font-mono text-[13px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
            <code className="block">{PROMPT_TEXT}</code>
          </pre>
        </div>

      </DialogContent>
    </Dialog>
  );
}
