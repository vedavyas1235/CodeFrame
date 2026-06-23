import { Link } from "@tanstack/react-router";
import { PromptInfo } from "./PromptInfo";

export function SiteHeader() {
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
              className="w-full h-full object-contain"
            >
              <source src="/logo_codeframe_2.mp4" type="video/mp4" />
            </video>
          </div>
          <span className="font-display text-xl tracking-tight">CodeFrame</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/" activeProps={{ className: "text-foreground" }} className="hover:text-foreground">
            Studio
          </Link>
          <Link to="/about" activeProps={{ className: "text-foreground" }} className="hover:text-foreground">
            About
          </Link>
          <PromptInfo />
        </nav>
      </div>
    </header>
  );
}
