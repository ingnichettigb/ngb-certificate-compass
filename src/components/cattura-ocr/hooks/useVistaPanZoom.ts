/*
 * File:      useVistaPanZoom.ts
 * Percorso:  src/components/cattura-ocr/hooks/useVistaPanZoom.ts
 * Zoom (50%–400%) e spostamento a mano (pan) del documento.
 */
import { useRef, useState } from "react";

export function useVistaPanZoom() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  function riduciZoom() {
    setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  }

  function aumentaZoom() {
    setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)));
  }

  function resetVista() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function iniziaPan(e: React.PointerEvent) {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function muoviPan(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  }

  function finisciPan() {
    dragging.current = false;
  }

  return { zoom, pan, riduciZoom, aumentaZoom, resetVista, iniziaPan, muoviPan, finisciPan };
}
