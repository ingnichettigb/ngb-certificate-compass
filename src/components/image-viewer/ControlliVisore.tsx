/*
 * File:      ControlliVisore.tsx
 * Percorso:  src/components/image-viewer/ControlliVisore.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da ImageViewer.tsx: barra dei controlli (ruota, zoom, reimposta, apri, schermo intero). Nessun cambio di comportamento.
 */
import {
  ExternalLink,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  rotazione: number;
  inRotazione: boolean;
  zoom: number;
  haUrl: boolean;
  fullscreen: boolean;
  onRuota: () => void;
  onZoomMeno: () => void;
  onZoomPiu: () => void;
  onReimposta: () => void;
  onApriEsterno: () => void;
  onToggleFullscreen: () => void;
}

export function ControlliVisore({
  rotazione,
  inRotazione,
  zoom,
  haUrl,
  fullscreen,
  onRuota,
  onZoomMeno,
  onZoomPiu,
  onReimposta,
  onApriEsterno,
  onToggleFullscreen,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRuota}
        className="h-8 gap-1.5 text-xs"
        title="Ruota di 90 gradi in senso orario"
        disabled={inRotazione}
      >
        <RotateCw className="size-3.5" />
        <span>Ruota</span>
        {rotazione > 0 && (
          <span className="font-mono text-[10px] font-semibold text-primary">{rotazione}°</span>
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={onZoomMeno}
        aria-label="Riduci zoom"
        title="Riduci zoom"
      >
        <ZoomOut className="size-4" />
      </Button>

      <span className="w-14 text-center font-mono text-sm tabular-nums text-muted-foreground">
        {Math.round(zoom * 100)}%
      </span>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={onZoomPiu}
        aria-label="Aumenta zoom"
        title="Aumenta zoom"
      >
        <ZoomIn className="size-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={onReimposta}
        aria-label="Reimposta zoom, rotazione e dimensioni"
        title="Reimposta tutto al 100%"
      >
        <RotateCcw className="size-4" />
      </Button>

      {haUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onApriEsterno}
          className="h-8 gap-1 text-xs"
          title="Apri in un'altra scheda del browser"
        >
          <ExternalLink className="size-3.5" />
          <span className="hidden sm:inline">Apri</span>
        </Button>
      )}

      {haUrl && (
        <Button
          type="button"
          variant={fullscreen ? "secondary" : "outline"}
          size="sm"
          onClick={onToggleFullscreen}
          className="h-8 gap-1 text-xs"
          title={fullscreen ? "Riduci a dimensione normale (Esc)" : "Ingrandisci a tutto schermo"}
        >
          {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          <span className="hidden sm:inline">{fullscreen ? "Chiudi" : "Schermo intero"}</span>
        </Button>
      )}
    </div>
  );
}
