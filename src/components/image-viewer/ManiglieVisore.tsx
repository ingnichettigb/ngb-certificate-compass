/*
 * File:      ManiglieVisore.tsx
 * Percorso:  src/components/image-viewer/ManiglieVisore.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da ImageViewer.tsx: le quattro maniglie per ridimensionare il riquadro. Nessun cambio di comportamento.
 */
import type { MouseEvent as EventoMouse } from "react";
import type { VerticeResize } from "./useRidimensionaVisore";

// Stile maniglia vertice riutilizzabile
const classeManiglia =
  "absolute z-30 size-4 rounded-sm border-2 border-primary bg-background shadow-md transition-colors hover:bg-primary hover:border-primary-foreground";

export function ManiglieVisore({
  onResize,
}: {
  onResize: (vertice: VerticeResize, e: EventoMouse) => void;
}) {
  return (
    <>
      {/* Vertice 1: Alto-Sinistra (NW) */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Ridimensiona da alto sinistra"
        title="Trascina per allargare/alzare"
        onMouseDown={(e) => onResize("nw", e)}
        className={`${classeManiglia} -top-1 -left-1 cursor-nwse-resize`}
      />

      {/* Vertice 2: Alto-Destra (NE) */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Ridimensiona da alto destra"
        title="Trascina per allargare/alzare"
        onMouseDown={(e) => onResize("ne", e)}
        className={`${classeManiglia} -top-1 -right-1 cursor-nesw-resize`}
      />

      {/* Vertice 3: Basso-Sinistra (SW) */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Ridimensiona da basso sinistra"
        title="Trascina per allargare/abbassare"
        onMouseDown={(e) => onResize("sw", e)}
        className={`${classeManiglia} -bottom-1 -left-1 cursor-nesw-resize`}
      />

      {/* Vertice 4: Basso-Destra (SE) */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Ridimensiona da basso destra"
        title="Trascina per allargare/abbassare"
        onMouseDown={(e) => onResize("se", e)}
        className={`${classeManiglia} -bottom-1 -right-1 cursor-nwse-resize`}
      />
    </>
  );
}
