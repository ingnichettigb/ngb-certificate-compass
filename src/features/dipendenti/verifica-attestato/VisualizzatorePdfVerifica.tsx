/*
 * File:          VisualizzatorePdfVerifica.tsx
 * Percorso:      src/features/dipendenti/verifica-attestato/VisualizzatorePdfVerifica.tsx
 * Data creazione: 2026-10-25
 * Revisioni:
 *   - Rev 1 (2026-10-25 21:35): Visualizzatore documento con zoom, rotazione 90° e scorrimento.
 */
import { useEffect, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, ExternalLink, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VisualizzatorePdfVerifica({
  fileHandle,
  nomeFile,
  onApriEsterno,
}: {
  fileHandle: FileSystemFileHandle;
  nomeFile: string;
  onApriEsterno: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotazione, setRotazione] = useState(0);

  useEffect(() => {
    let attivo = true;
    let creato = "";
    fileHandle.getFile().then((f) => {
      if (!attivo) return;
      creato = URL.createObjectURL(f);
      setIsPdf(f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
      setUrl(creato);
    });
    return () => {
      attivo = false;
      if (creato) URL.revokeObjectURL(creato);
    };
  }, [fileHandle]);

  const ruotato = rotazione % 180 !== 0;
  const base = { w: 800, h: 1100 };
  const w = (ruotato ? base.h : base.w) * zoom;
  const h = (ruotato ? base.w : base.h) * zoom;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-muted/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/60 px-4 py-2 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-primary" />
          <span className="max-w-[320px] truncate font-semibold" title={nomeFile}>{nomeFile}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button type="button" size="sm" variant="outline" onClick={() => setRotazione((r) => (r + 90) % 360)} className="h-8 gap-1.5 text-xs">
            <RotateCw className="size-3.5" /> Ruota a destra
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.2).toFixed(1)))} aria-label="Riduci zoom">
            <ZoomOut className="size-3.5" />
          </Button>
          <span className="w-12 text-center font-mono tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => setZoom((z) => Math.min(4, +(z + 0.2).toFixed(1)))} aria-label="Ingrandisci">
            <ZoomIn className="size-3.5" />
          </Button>
          <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => { setZoom(1); setRotazione(0); }} aria-label="Ripristina">
            <RotateCcw className="size-3.5" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onApriEsterno} className="h-8 gap-1 text-xs">
            <ExternalLink className="size-3.5" /> Nuova scheda
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/50 p-4">
        {url ? (
          <div className="mx-auto" style={{ width: w, height: h, position: "relative" }}>
            <div
              style={{
                width: base.w * zoom,
                height: base.h * zoom,
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) rotate(${rotazione}deg)`,
              }}
            >
              {isPdf ? (
                <iframe src={`${url}#toolbar=0&view=FitH`} title="Anteprima documento" className="h-full w-full rounded border border-border bg-background" />
              ) : (
                <img src={url} alt="Anteprima documento" className="h-full w-full rounded border border-border bg-background object-contain" />
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" /> Caricamento documento...
          </div>
        )}
      </div>
    </div>
  );
}
