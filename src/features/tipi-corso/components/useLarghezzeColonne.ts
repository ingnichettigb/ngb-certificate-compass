/*
 * File:      useLarghezzeColonne.ts
 * Percorso:  src/features/tipi-corso/components/useLarghezzeColonne.ts
 * Creato:    10/11/2026
 * Larghezze delle colonne regolabili trascinando il bordo dell'intestazione. Le misure si
 * ricordano su questo computer; doppio clic sul bordo = larghezza originale di quella colonna.
 */
import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent } from "react";

const MINIMA = 44;

function leggi(chiave: string, iniziali: number[]): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(chiave) ?? "null") as unknown;
    if (Array.isArray(v) && v.length === iniziali.length && v.every((n) => typeof n === "number" && n >= MINIMA)) {
      return v as number[];
    }
  } catch {
    /* memoria non disponibile o contenuto non valido: si usano le misure iniziali */
  }
  return iniziali;
}

function salva(chiave: string, larghezze: number[]) {
  try {
    localStorage.setItem(chiave, JSON.stringify(larghezze));
  } catch {
    /* non critico */
  }
}

export function useLarghezzeColonne(chiave: string, iniziali: number[]) {
  const [larghezze, setLarghezze] = useState<number[]>(() => leggi(chiave, iniziali));
  const presa = useRef<{ indice: number; x: number; larghezza: number } | null>(null);
  const ultime = useRef(larghezze);
  ultime.current = larghezze;

  /** Proprietà da applicare alla maniglia posta sul bordo destro dell'intestazione della colonna. */
  const maniglia = useCallback(
    (indice: number) => ({
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        presa.current = { indice, x: e.clientX, larghezza: ultime.current[indice] ?? MINIMA };
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        const p = presa.current;
        if (!p || p.indice !== indice) return;
        const nuova = Math.max(MINIMA, Math.round(p.larghezza + e.clientX - p.x));
        setLarghezze((l) => l.map((w, i) => (i === indice ? nuova : w)));
      },
      onPointerUp: (e: PointerEvent<HTMLElement>) => {
        if (!presa.current) return;
        presa.current = null;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        salva(chiave, ultime.current);
      },
      onDoubleClick: (e: ReactMouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setLarghezze((l) => {
          const n = l.map((w, i) => (i === indice ? (iniziali[i] ?? w) : w));
          salva(chiave, n);
          return n;
        });
      },
    }),
    [chiave, iniziali],
  );

  const ripristina = useCallback(() => {
    setLarghezze(iniziali);
    salva(chiave, iniziali);
  }, [chiave, iniziali]);

  const modificate = larghezze.some((w, i) => w !== iniziali[i]);
  const totale = larghezze.reduce((a, b) => a + b, 0);
  return { larghezze, totale, maniglia, ripristina, modificate };
}
