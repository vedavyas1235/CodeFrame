import { forwardRef, useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

type Props = {
  width: number;
  height: number;
  onViewChange?: (zoom: number, panX: number, panY: number) => void;
};

export const HtmlPreview = forwardRef<HTMLIFrameElement, Props>(function HtmlPreview(
  { width, height, onViewChange },
  ref,
) {
  const [zoom, setZoom] = useState(1);
  // panX and panY are in logical physical pixels (0 to width, 0 to height)
  // They represent the center point of the crop box. Defaults to center.
  const [panX, setPanX] = useState(width / 2);
  const [panY, setPanY] = useState(height / 2);
  const containerRef = useRef<HTMLDivElement>(null);

  // Notify parent of view changes
  useEffect(() => {
    onViewChange?.(zoom, panX, panY);
  }, [zoom, panX, panY, onViewChange]);

  // Reset view when aspect ratio changes
  useEffect(() => {
    setZoom(1);
    setPanX(width / 2);
    setPanY(height / 2);
  }, [width, height]);

  // Enforce pan boundaries when zoom changes
  useEffect(() => {
    const viewW = width / zoom;
    const viewH = height / zoom;
    const minX = viewW / 2;
    const maxX = width - viewW / 2;
    const minY = viewH / 2;
    const maxY = height - viewH / 2;
    setPanX((p) => Math.max(minX, Math.min(maxX, p)));
    setPanY((p) => Math.max(minY, Math.min(maxY, p)));
  }, [zoom, width, height]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return; // No panning needed if fully zoomed out
    const startX = e.clientX;
    const startY = e.clientY;
    const startPanX = panX;
    const startPanY = panY;

    const container = containerRef.current;
    if (!container) return;
    const previewScale = parseFloat(container.style.getPropertyValue("--preview-scale") || "1");

    const handlePointerMove = (moveEvent: PointerEvent) => {
      // Delta in physical screen pixels
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      
      // Convert screen pixels to logical iframe pixels
      // Since we are dragging the crop box (not the camera), moving mouse right means box moves right (panX increases)
      let newPanX = startPanX + (dx / previewScale);
      let newPanY = startPanY + (dy / previewScale);

      // Clamp crop box so it stays inside the iframe bounds
      const viewW = width / zoom;
      const viewH = height / zoom;
      const minX = viewW / 2;
      const maxX = width - viewW / 2;
      const minY = viewH / 2;
      const maxY = height - viewH / 2;

      setPanX(Math.max(minX, Math.min(maxX, newPanX)));
      setPanY(Math.max(minY, Math.min(maxY, newPanY)));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Calculate crop box rect
  const cropW = width / zoom;
  const cropH = height / zoom;
  const cropX = panX - cropW / 2;
  const cropY = panY - cropH / 2;

  return (
    <div className="w-full space-y-4">
      {/* PREVIEW CONTAINER */}
      <div
        className="preview-grain mx-auto w-full overflow-hidden rounded-xl border border-border bg-black shadow-[0_30px_120px_-40px_rgba(0,0,0,0.8)] relative"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <div
          className="origin-top-left absolute top-0 left-0"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transform: "scale(var(--preview-scale, 1))",
          }}
          ref={(el) => {
            if (!el) return;
            containerRef.current = el;
            const ro = new ResizeObserver(() => {
              const parent = el.parentElement;
              if (!parent) return;
              const scale = parent.clientWidth / width;
              el.style.setProperty("--preview-scale", String(scale));
            });
            if (el.parentElement) ro.observe(el.parentElement);
          }}
        >
          {/* 1. The Actual Animation (Native Size, Unzoomed) */}
          <iframe
            ref={ref}
            title="HTML preview"
            sandbox="allow-scripts"
            className="absolute top-0 left-0 block border-0 bg-white"
            style={{ width: `${width}px`, height: `${height}px` }}
          />

          {/* 2. The Crop Box Overlay (SVG) */}
          {zoom > 1 && (
            <svg 
              className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing" 
              onPointerDown={handlePointerDown}
              style={{ pointerEvents: 'auto' }} // Ensure SVG catches drag events
            >
              {/* Dimmed Background */}
              <path
                d={`M 0 0 h ${width} v ${height} h -${width} Z M ${cropX} ${cropY} h ${cropW} v ${cropH} h -${cropW} Z`}
                fill="rgba(0,0,0,0.7)"
                fillRule="evenodd"
              />
              {/* White Border Coat */}
              <rect
                x={cropX}
                y={cropY}
                width={cropW}
                height={cropH}
                fill="none"
                stroke="white"
                strokeWidth="4" // 4px logical border
                className="shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              />
            </svg>
          )}
        </div>
      </div>
      
      {/* ZOOM CONTROLS (Below Preview) */}
      <div className="flex items-center gap-3 bg-card border border-border px-4 py-3 rounded-lg">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">Crop Box</span>
        <button onClick={() => setZoom(Math.max(1, zoom - 0.25))} className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground">
          <ZoomOut className="w-4 h-4" />
        </button>
        <input 
          type="range" 
          min="1" 
          max="4" 
          step="0.1" 
          value={zoom} 
          onChange={(e) => setZoom(parseFloat(e.target.value))} 
          className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <button onClick={() => setZoom(Math.min(4, zoom + 0.25))} className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground">
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-border mx-2" />
        <button onClick={() => { setZoom(1); setPanX(width/2); setPanY(height/2); }} className="px-2.5 py-1 text-xs font-medium bg-muted hover:bg-primary/20 hover:text-primary rounded-md transition-colors" title="Reset view">
          Reset
        </button>
      </div>
    </div>
  );
});
