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

const PROMPT_TEXT = `This HTML file will be fed into a DOM-snapshot rendering engine to generate a high-quality MP4 video. To ensure perfect rendering without missing fonts, frozen animations, or CORS crashes, you MUST adhere strictly to these rules:

1. **USE JS ANIMATIONS (NO CSS TRANSITIONS)**: You are strictly forbidden from using CSS \`transition\` for animations. Because the engine freezes time to take DOM snapshots, CSS transitions (which rely on the physical real-time clock) will permanently freeze at 0%. You MUST use JavaScript-based animation libraries (like GSAP or Anime.js) or \`requestAnimationFrame\` instead. CSS \`@keyframes\` are allowed but JS animations are strongly preferred.
2. **CORS FOR EXTERNAL FONTS**: If you include external fonts (e.g., Google Fonts), you MUST add \`crossorigin="anonymous"\` to the \`<link>\` tag. Without this, the engine will throw a SecurityError when trying to embed the font rules, causing all text to break.
3. **MODERN CDNS FOR IMAGES/EMOJIS**: If you inject SVGs or emojis (like Twemoji), ensure you use a working CDN that provides CORS headers (e.g., \`jsdelivr\` or \`unpkg\`). Never use discontinued CDNs like \`maxcdn\`.
4. **NO CROSS-ORIGIN IFRAMES**: Do not include iframes pointing to external sites (like YouTube embeds). The engine runs in a secure sandbox and cannot serialize cross-origin iframes, causing a crash.
5. **SINGLE HTML FILE**: All HTML, CSS, and JavaScript MUST be contained within a single standalone \`index.html\` file. Do not output separate \`.css\` or \`.js\` files.

Please structure the UI with beautiful, modern aesthetics, but ensure the underlying code adheres to these constraints.`;

export function PromptInfoHQ() {
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
          <span>HQ Mode Prompt</span>
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
              <DialogTitle className="text-lg font-display tracking-tight">AI Prompt for High-Quality Mode</DialogTitle>
            </div>
            <DialogDescription className="mt-1 text-xs leading-relaxed opacity-90 max-w-[95%]">
              Appending this prompt to your AI instructions forces the AI to build complex UI animations using techniques that our High-Quality engine can perfectly capture (e.g., using GSAP instead of CSS transitions).
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
