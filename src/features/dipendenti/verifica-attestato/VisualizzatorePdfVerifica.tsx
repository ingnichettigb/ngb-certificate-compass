/*
 * File:          VisualizzatorePdfVerifica.tsx
 * Percorso:      src/features/dipendenti/verifica-attestato/VisualizzatorePdfVerifica.tsx
 * Data creazione: 2026-10-25
 * Revisioni:
 *   - Rev 1 (2026-10-25 21:35): Visualizzatore documento con zoom, rotazione 90° e scorrimento.
 *   - Rev 2 (2026-10-25 21:45): Dimensionamento fluido a piena altezza/larghezza senza vincolo fisso 800px.
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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {/* Barra controlli del documento */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/60 px-4 py-2.5 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-primary" />
          <span className="truncate font-semibold text-foreground" title={nomeFile}>
            {nomeFile}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRotazione((r) => (r + 90) % 360)}
            className="h-8 gap-1.5 text-xs"
          >
            <RotateCw className="size-3.5" /> Ruota a destra (+90°)
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            aria-label="Riduci zoom"
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <span className="w-12 text-center font-mono font-medium tabular-nums text-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
            aria-label="Ingrandisci"
          >
            <ZoomIn className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8"
            onClick={() => {
              setZoom(1);
              setRotazione(0);
            }}
            aria-label="Ripristina visualizzazione originale"
            title="Ripristina 100%"
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onApriEsterno} className="h-8 gap-1 text-xs">
            <ExternalLink className="size-3.5" /> Apri in un'altra scheda
          </Button>
        </div>
      </div>

      {/* Area del documento a tutto schermo reale */}
      <div className="flex-1 overflow-auto bg-muted/30 p-2">
        {url ? (
          <div
            className="flex h-full w-full items-center justify-center transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotazione}deg)`,
              transformOrigin: "center center",
            }}
          >
            {isPdf ? (
              <iframe
                src={`${url}#toolbar=0&view=FitH`}
                title="Anteprima documento"
                className="h-full w-full rounded border border-border bg-background shadow-md"
              />
            ) : (
              <img
                src={url}
                alt="Anteprima documento"
                className="max-h-full max-w-full rounded border border-border bg-background object-contain shadow-md"
              />
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" /> Caricamento documento in corso...
          </div>
        )}
      </div>
    </div>
  );
}
