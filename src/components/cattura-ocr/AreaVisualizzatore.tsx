/*
 * File:      AreaVisualizzatore.tsx
 * Percorso:  src/components/cattura-ocr/AreaVisualizzatore.tsx
 * Area centrale: documento con pan e zoom, rettangolo del mirino e indicatori di caricamento/lettura.
 */
import { Loader2 } from "lucide-react";
import type { ModalitaVista, Rett } from "./types";

interface Props {
  src: string | null;
  caricamento: boolean;
  modalita: ModalitaVista;
  pan: { x: number; y: number };
  zoom: number;
  imgRef: React.RefObject<HTMLImageElement | null>;
  rett: Rett | null;
  occupato: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
}

export function AreaVisualizzatore({
  src,
  caricamento,
  modalita,
  pan,
  zoom,
  imgRef,
  rett,
  occupato,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: Props) {
  return (
    <div className="relative flex-1 min-h-[480px] overflow-hidden flex items-center justify-center p-3">
      {caricamento || !src ? (
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="size-7 animate-spin text-primary" />
          <span className="text-xs">Caricamento documento in corso...</span>
        </div>
      ) : (
        <div
          className={`relative inline-block transition-transform duration-75 ${
            modalita === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
          }`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt="Documento attestato"
            draggable={false}
            className="max-h-[65vh] w-auto max-w-full block shadow-md select-none pointer-events-none"
          />

          {/* Rettangolo di selezione OCR */}
          {rett && modalita === "ocr" && (
            <div
              className="absolute border-2 border-primary bg-primary/25 pointer-events-none"
              style={{
                left: rett.x,
                top: rett.y,
                width: rett.w,
                height: rett.h,
              }}
            />
          )}

          {/* Overlay di elaborazione OCR */}
          {occupato && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex items-center justify-center gap-2 text-sm font-medium">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>Lettura testo dal rettangolo...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
