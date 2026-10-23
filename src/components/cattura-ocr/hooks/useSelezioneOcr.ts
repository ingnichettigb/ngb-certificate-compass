/*
 * File:      useSelezioneOcr.ts
 * Percorso:  src/components/cattura-ocr/hooks/useSelezioneOcr.ts
 * Mirino OCR: disegno del rettangolo sul documento e lettura del testo selezionato.
 */
import { useRef, useState } from "react";
import { leggiTesto, ritagliaRettangolo } from "../ocr-worker";
import type { Rett } from "../types";

interface Opzioni {
  imgRef: React.RefObject<HTMLImageElement | null>;
  zoom: number;
  onTesto?: ((testo: string) => void) | undefined;
}

export function useSelezioneOcr({ imgRef, zoom, onTesto }: Opzioni) {
  const [rett, setRett] = useState<Rett | null>(null);
  const [occupato, setOccupato] = useState(false);
  const inizio = useRef<{ x: number; y: number } | null>(null);

  // Calcolo coordinate normalizzate rispetto all'immagine interna
  function pos(e: React.PointerEvent) {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const r = img.getBoundingClientRect();
    const cx = Math.max(0, Math.min(r.width, e.clientX - r.left));
    const cy = Math.max(0, Math.min(r.height, e.clientY - r.top));
    return {
      x: cx / zoom,
      y: cy / zoom,
    };
  }

  function iniziaSelezione(e: React.PointerEvent) {
    const p = pos(e);
    inizio.current = p;
    setRett({ x: p.x, y: p.y, w: 0, h: 0 });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function aggiornaSelezione(e: React.PointerEvent) {
    if (!inizio.current) return;
    const p = pos(e);
    const s = inizio.current;
    setRett({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  }

  async function concludiSelezione() {
    const r = rett;
    inizio.current = null;
    const img = imgRef.current;
    if (!r || !img || r.w < 5 || r.h < 5) {
      setRett(null);
      return;
    }

    const canvas = ritagliaRettangolo(img, r);

    setOccupato(true);
    try {
      const testo = await leggiTesto(canvas);
      if (onTesto) onTesto(testo);
    } catch {
      if (onTesto) onTesto("");
    } finally {
      setOccupato(false);
      setRett(null);
    }
  }

  return { rett, occupato, iniziaSelezione, aggiornaSelezione, concludiSelezione };
}
