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
    tagline: "Lightning Fast Export",
    body: "The fastest way to export your animations. Optimized for pure graphics and visual effects, delivering instantaneous, flawlessly smooth results in seconds. Note: Standard text and complex layouts may not appear in this mode.",
    icon: Zap,
    badge: "Free (Local)",
  },
  {
    id: "tabcapture",
    title: "High Quality Mode",
    tagline: "Pixel-Perfect Precision",
    body: "The most accurate local rendering method. Perfectly captures standard text, custom fonts, and complex layouts that Quick Mode might miss, guaranteeing a true-to-life export of your entire animation.",
    icon: Gauge,
    badge: "Free (Local)",
  },
  {
    id: "studio",
    title: "Studio Mode",
    tagline: "Professional Cloud Pipeline",
    body: "Our flagship rendering engine designed for heavy, professional workloads. Offloads all processing to our secure servers to guarantee perfect frame rates and maximum quality for even the most demanding web animations.",
    icon: Crown,
    badge: "Active (Cloud)",
  },
];

type Props = {
  value: RecordMethod;
  onChange: (m: RecordMethod) => void;
  hasWebCodecs?: boolean;
  busy?: boolean;
};

export function MethodPicker({ value, onChange, hasWebCodecs = true, busy = false }: Props) {
  return (
    <div className="grid gap-3">
      {methods.map((baseMethod) => {
        const m = { ...baseMethod };
        // Disable local methods if WebCodecs are not supported
        if (!hasWebCodecs && (m.id === "realtime" || m.id === "tabcapture")) {
          m.disabled = true;
          m.badge = "Unsupported";
          m.body = m.body + " Please use Google Chrome or Microsoft Edge to unlock this feature.";
        }

        const Icon = m.icon;
        const selected = value === m.id;
        const isDisabled = m.disabled || busy;
        return (
          <button
            key={m.id}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(m.id)}
            className={cn(
              "text-left rounded-xl border p-4 transition-all",
              selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              isDisabled && "opacity-60 cursor-not-allowed hover:border-border",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                  selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                  isDisabled && "opacity-50"
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
                            ? "border-destructive/30 text-destructive bg-destructive/10"
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
