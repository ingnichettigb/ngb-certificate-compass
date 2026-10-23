/*
 * File:      BarraStrumenti.tsx
 * Percorso:  src/components/cattura-ocr/BarraStrumenti.tsx
 * Barra superiore del visualizzatore: pagine PDF, rotazione, modalità Mano/Mirino e zoom.
 */
import {
  RotateCw,
  Hand,
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ModalitaVista } from "./types";

interface Props {
  isPdf: boolean;
  totPagine: number;
  pagina: number;
  onPagina: (aggiorna: (p: number) => number) => void;
  rotazione: number;
  onRuota: () => void;
  modalita: ModalitaVista;
  onModalita: (m: ModalitaVista) => void;
  zoom: number;
  onRiduciZoom: () => void;
  onAumentaZoom: () => void;
  onResetVista: () => void;
}

export function BarraStrumenti({
  isPdf,
  totPagine,
  pagina,
  onPagina,
  rotazione,
  onRuota,
  modalita,
  onModalita,
  zoom,
  onRiduciZoom,
  onAumentaZoom,
  onResetVista,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background/80 p-2 text-xs">
      {/* Gruppo Sinistra: Paginazione + Rotazione + Modalità Pan / OCR */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {isPdf && totPagine > 1 && (
          <div className="flex items-center gap-1 border-r pr-2 mr-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-7"
              disabled={pagina <= 1}
              onClick={() => onPagina((p) => p - 1)}
              title="Pagina precedente"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs font-mono px-1">
              {pagina}/{totPagine}
            </span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-7"
              disabled={pagina >= totPagine}
              onClick={() => onPagina((p) => p + 1)}
              title="Pagina successiva"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}

        {/* Un solo pulsante ruota a destra a scatti di 90° */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRuota}
          title="Ruota di 90° in senso orario (clicca per ruotare ancora)"
          className="gap-1.5 h-7 px-2.5 text-xs font-medium"
        >
          <RotateCw className="size-3.5" />
          <span>Ruota 90°</span>
          {rotazione > 0 && (
            <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-semibold text-primary">
              {rotazione}°
            </span>
          )}
        </Button>

        {/* Modalità Sposta (Manina Pan) */}
        <Button
          type="button"
          size="sm"
          variant={modalita === "pan" ? "default" : "outline"}
          onClick={() => onModalita("pan")}
          title="Modalità Mano (Pan): trascina il documento per spostarlo"
          className="gap-1.5 h-7 px-2.5 text-xs font-medium"
        >
          <Hand className="size-3.5" />
          <span>Mano (Pan)</span>
        </Button>

        {/* Modalità Selezione Mirino OCR */}
        <Button
          type="button"
          size="sm"
          variant={modalita === "ocr" ? "default" : "outline"}
          onClick={() => onModalita("ocr")}
          title="Modalità Mirino: trascina un rettangolo sul testo per catturarlo"
          className="gap-1.5 h-7 px-2.5 text-xs font-medium"
        >
          <Crosshair className="size-3.5" />
          <span>Mirino OCR</span>
        </Button>
      </div>

      {/* Gruppo Destra: Zoom */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-7"
          onClick={onRiduciZoom}
          title="Riduci zoom"
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <span className="w-12 text-center font-mono text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-7"
          onClick={onAumentaZoom}
          title="Aumenta zoom"
        >
          <ZoomIn className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-7"
          onClick={onResetVista}
          title="Reimposta vista (100% e centrata)"
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
