/*
 * File:      useRidimensionaVisore.ts
 * Percorso:  src/components/image-viewer/useRidimensionaVisore.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da ImageViewer.tsx: dimensioni del riquadro trascinando i 4 vertici. Nessun cambio di comportamento.
 */
import { useRef, useState, type MouseEvent as EventoMouse } from "react";

export type VerticeResize = "nw" | "ne" | "sw" | "se";

export function useRidimensionaVisore() {
  const [altezzaCustom, setAltezzaCustom] = useState<number>(620);
  const [larghezzaCustom, setLarghezzaCustom] = useState<number | null>(null);
  const dragRef = useRef<{
    vertice: VerticeResize;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Gestione trascinamento dei 4 vertici
  function iniziaResize(vertice: VerticeResize, e: EventoMouse) {
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    const rect = el ? el.getBoundingClientRect() : { width: 500, height: altezzaCustom };

    dragRef.current = {
      vertice,
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
    };

    function onMouseMove(moveEvent: MouseEvent) {
      if (!dragRef.current) return;
      const { vertice: v, startX, startY, startW, startH } = dragRef.current;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let nuovoH = startH;
      let nuovoW = startW;

      // Invertiamo il delta per i vertici superiori / sinistri
      if (v === "se") {
        nuovoW = startW + deltaX;
        nuovoH = startH + deltaY;
      } else if (v === "sw") {
        nuovoW = startW - deltaX;
        nuovoH = startH + deltaY;
      } else if (v === "ne") {
        nuovoW = startW + deltaX;
        nuovoH = startH - deltaY;
      } else if (v === "nw") {
        nuovoW = startW - deltaX;
        nuovoH = startH - deltaY;
      }

      setAltezzaCustom(Math.max(380, Math.min(1400, Math.round(nuovoH))));
      setLarghezzaCustom(Math.max(400, Math.min(1800, Math.round(nuovoW))));
    }

    function onMouseUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function reimpostaDimensioni() {
    setAltezzaCustom(620);
    setLarghezzaCustom(null);
  }

  return { altezzaCustom, larghezzaCustom, containerRef, iniziaResize, reimpostaDimensioni };
}
