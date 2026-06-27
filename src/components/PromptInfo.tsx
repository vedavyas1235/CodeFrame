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
        <Button variant="ghost" size="sm" className="h-5 px-2 gap-1 rounded-full text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors">
          <Info className="w-2.5 h-2.5" />
          <span>Quick Mode Prompt</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[700px] p-0 overflow-hidden bg-background border-border shadow-2xl sm:rounded-2xl transition-all">
        {/* Header section */}
        <div className="px-6 pt-3 pb-1.5 bg-muted/10">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-display tracking-tight">AI Prompt for Quick Mode</DialogTitle>
            </div>
            <DialogDescription className="mt-1 text-xs leading-relaxed opacity-90 max-w-[95%]">
              Appending this prompt to your AI instructions forces it to draw all text mathematically onto the canvas. This guarantees perfect compatibility with Quick Mode.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Code area - fits without scrolling */}
        <div className="px-6 pb-1.5">
          <div className="p-2 bg-zinc-950 dark:bg-zinc-950/80 rounded-lg border border-border/40">
            <pre className="font-mono text-[11px] leading-snug text-zinc-300 whitespace-pre-wrap break-words">
              <code className="block">{PROMPT_TEXT}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-2 border-t border-border/40 bg-muted/20 flex justify-end">
          <Button 
            size="sm" 
            onClick={handleCopy}
            className={`h-8 gap-2 text-xs transition-all duration-300 ${copied ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Prompt
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
