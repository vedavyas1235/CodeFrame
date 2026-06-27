import { Link } from "@tanstack/react-router";
import { PromptInfo } from "./PromptInfo";
import { PromptInfoHQ } from "./PromptInfoHQ";

export function SiteHeader({ busy = false }: { busy?: boolean }) {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative inline-block w-8 h-8 rounded-[4px] overflow-hidden group-hover:rotate-12 group-hover:scale-110 transition-transform">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              poster="/favicon.png"
              className="w-full h-full object-contain"
            >
              <source src="/logo_codeframe_2.mp4" type="video/mp4" />
            </video>
          </div>
          <span className="font-display text-xl tracking-tight">CodeFrame</span>
        </Link>
        <nav className={`flex items-center gap-4 text-xs font-medium text-muted-foreground transition-opacity duration-300 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          
          {/* Prompts Group Box */}
          <div className="flex items-center bg-secondary/50 border border-border/60 rounded-full p-1 shadow-sm">
            <PromptInfo />
            <div className="w-[1px] h-4 bg-border/50 mx-1"></div>
            <PromptInfoHQ />
          </div>

          {/* Nav Links Group Box */}
          <div className="flex items-center bg-secondary/50 border border-border/60 rounded-full p-1 shadow-sm">
            <Link 
              to="/" 
              activeProps={{ className: "bg-background text-foreground shadow-sm" }} 
              className="px-4 py-1.5 rounded-full hover:text-foreground transition-all duration-200"
            >
              Studio
            </Link>
            <Link 
              to="/about" 
              activeProps={{ className: "bg-background text-foreground shadow-sm" }} 
              className="px-4 py-1.5 rounded-full hover:text-foreground transition-all duration-200"
            >
              About
            </Link>
          </div>

        </nav>
      </div>
    </header>
  );
}
