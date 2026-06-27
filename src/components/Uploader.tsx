import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileCode } from "lucide-react";

type Props = {
  onFile: (name: string, html: string) => void;
};

const MAX_BYTES = 5 * 1024 * 1024;

export function Uploader({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = useCallback(
    async (file: File | undefined) => {
      setError(null);
      if (!file) return;
      if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
        setError("Please upload a single .html file.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("File is too large (max 5 MB).");
        return;
      }
      const text = await file.text();
      const sample = text.slice(0, 1000).toLowerCase();
      if (!sample.includes('<html') && !sample.includes('<!doctype') && !sample.includes('<head') && !sample.includes('<body')) {
        setError("This doesn't appear to be a valid HTML file. Please check the file contents.");
        return;
      }
      
      onFile(file.name, text);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void handle(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={`group cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
        over ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,text/html"
        className="hidden"
        onChange={(e) => void handle(e.target.files?.[0] ?? undefined)}
      />
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
        <UploadCloud className="h-7 w-7" />
      </div>
      <h3 className="font-display text-2xl">Drop your HTML file here</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Single self-contained <code className="text-foreground">.html</code> file. Up to 5 MB.
      </p>
      <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <FileCode className="h-3.5 w-3.5" /> Inline your CSS, JS, and images for best results
      </p>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  );
}
