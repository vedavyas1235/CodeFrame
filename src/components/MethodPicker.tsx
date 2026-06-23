import { Zap, Gauge, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

// We keep the internal IDs "realtime" and "tabcapture" so we don't have to rename everything in index.tsx,
// but their underlying engines have been massively upgraded.
export type RecordMethod = "realtime" | "tabcapture" | "studio";

const methods: {
  id: RecordMethod;
  title: string;
  tagline: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
}[] = [
  {
    id: "realtime",
    title: "Quick Mode",
    tagline: "Local Offline Canvas Engine",
    body: "Instantly exports pure Canvas/WebGL animations using a deterministic virtual clock. Fast, smooth, and perfectly immune to browser lag. Does not capture DOM or CSS overlays.",
    icon: Zap,
    badge: "Free",
  },
  {
    id: "tabcapture",
    title: "High Quality Mode",
    tagline: "Offline DOM Snapshotting",
    body: "Captures heavy HTML/CSS animations flawlessly by rendering them entirely offline. Guarantees perfectly smooth 60fps exports without any screen-record permissions or mouse cursors.",
    icon: Gauge,
    badge: "Free",
  },
  {
    id: "studio",
    title: "Studio Mode",
    tagline: "Headless Chromium · Serverless Backend",
    body: "Pixel-perfect rendering directly from our backend Chromium GPU compositor. Guarantees 60fps flawlessly without canvas rounding errors. Recommended for complex DOM, external fonts, and professional exports.",
    icon: Crown,
    badge: "Active",
  },
];

type Props = {
  value: RecordMethod;
  onChange: (m: RecordMethod) => void;
};

export function MethodPicker({ value, onChange }: Props) {
  return (
    <div className="grid gap-3">
      {methods.map((m) => {
        const Icon = m.icon;
        const selected = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={m.disabled}
            onClick={() => !m.disabled && onChange(m.id)}
            className={cn(
              "text-left rounded-xl border p-4 transition-all",
              selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              m.disabled && "opacity-60 cursor-not-allowed hover:border-border",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                  selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-medium">{m.title}</h4>
                  {m.badge && (
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
                        m.id === "studio"
                          ? "border-primary bg-primary/10 text-primary"
                          : m.disabled
                            ? "border-border text-muted-foreground"
                            : "border-primary/40 text-primary",
                      )}
                    >
                      {m.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{m.tagline}</p>
                <p className="mt-2 text-sm text-muted-foreground/90">{m.body}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
