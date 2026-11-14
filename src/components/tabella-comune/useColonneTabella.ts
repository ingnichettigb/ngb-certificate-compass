/*
 * File:      useColonneTabella.ts
 * Percorso:  src/components/tabella-comune/useColonneTabella.ts
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 21:50 — Punto unico per le tabelle: larghezza colonne regolabile (doppio clic ripristina),
 *            colonne spostabili trascinando l'intestazione, ordinamento a 3 clic (A→Z, Z→A, originale), memoria locale.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

export type Verso = "asc" | "desc";
export type Ordinamento = { chiave: string; verso: Verso } | null;

type Salvato = { ordine?: string[]; larghezze?: Record<string, number> };

const LARGHEZZA_MIN = 50;

function leggi(chiave: string): Salvato {
  try {
    return JSON.parse(localStorage.getItem(`tabella:${chiave}`) ?? "{}") as Salvato;
  } catch {
    return {};
  }
}

/** Ciclo del clic sull'intestazione: nessuno → A→Z → Z→A → nessuno. */
export function prossimoOrdinamento(attuale: Ordinamento, chiave: string): Ordinamento {
  if (!attuale || attuale.chiave !== chiave) return { chiave, verso: "asc" };
  if (attuale.verso === "asc") return { chiave, verso: "desc" };
  return null;
}

/** Confronto naturale in italiano (numeri come numeri, vuoti in fondo). */
export function confronta(a: unknown, b: unknown): number {
  const va = a === null || a === undefined || a === "";
  const vb = b === null || b === undefined || b === "";
  if (va || vb) return va === vb ? 0 : va ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(b) - Number(a);
  return String(a).localeCompare(String(b), "it", { numeric: true, sensitivity: "base" });
}

export function ordinaRighe<T extends Record<string, unknown>>(righe: T[], ord: Ordinamento): T[] {
  if (!ord) return righe;
  const s = ord.verso === "asc" ? 1 : -1;
  return [...righe].sort((x, y) => s * confronta(x[ord.chiave], y[ord.chiave]));
}

/** Allinea l'ordine salvato alle colonne effettive (nuove in coda, sparite rimosse). */
export function allineaOrdine(salvato: string[] | undefined, chiavi: string[]): string[] {
  const validi = (salvato ?? []).filter((k) => chiavi.includes(k));
  return [...validi, ...chiavi.filter((k) => !validi.includes(k))];
}

export function useColonneTabella(chiaveMemoria: string, chiavi: string[]) {
  const firma = chiavi.join("|");
  const [ordine, setOrdine] = useState<string[]>(chiavi);
  const [larghezze, setLarghezze] = useState<Record<string, number>>({});
  const [ordinamento, setOrdinamento] = useState<Ordinamento>(null);
  const [trascinata, setTrascinata] = useState<string | null>(null);

  // Lettura della memoria solo dopo il montaggio (evita differenze tra server e browser).
  useEffect(() => {
    const s = leggi(chiaveMemoria);
    setOrdine(allineaOrdine(s.ordine, firma.split("|")));
    setLarghezze(s.larghezze ?? {});
  }, [chiaveMemoria, firma]);

  const salva = useCallback(
    (dati: Salvato) => {
      try {
        localStorage.setItem(`tabella:${chiaveMemoria}`, JSON.stringify({ ...leggi(chiaveMemoria), ...dati }));
      } catch {
        /* memoria non disponibile: si continua senza salvare */
      }
    },
    [chiaveMemoria],
  );

  const impostaLarghezza = useCallback(
    (k: string, px: number | null) => {
      setLarghezze((prec) => {
        const nuovo = { ...prec };
        if (px === null) delete nuovo[k];
        else nuovo[k] = Math.max(LARGHEZZA_MIN, Math.round(px));
        salva({ larghezze: nuovo });
        return nuovo;
      });
    },
    [salva],
  );

  /** Avvia il ridimensionamento dal bordo destro dell'intestazione. */
  const iniziaResize = useCallback(
    (k: string, e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const th = (e.currentTarget as HTMLElement).closest("th");
      const partenza = e.clientX;
      const base = th?.getBoundingClientRect().width ?? 120;
      const muovi = (ev: PointerEvent) => impostaLarghezza(k, base + ev.clientX - partenza);
      const fine = () => {
        window.removeEventListener("pointermove", muovi);
        window.removeEventListener("pointerup", fine);
      };
      window.addEventListener("pointermove", muovi);
      window.addEventListener("pointerup", fine);
    },
    [impostaLarghezza],
  );

  const sposta = useCallback(
    (da: string, a: string) => {
      if (da === a) return;
      setOrdine((prec) => {
        const n = prec.filter((k) => k !== da);
        n.splice(n.indexOf(a), 0, da);
        salva({ ordine: n });
        return n;
      });
    },
    [salva],
  );

  const cliccaOrdina = useCallback((k: string) => setOrdinamento((o) => prossimoOrdinamento(o, k)), []);

  const ripristina = useCallback(() => {
    setOrdine(firma.split("|"));
    setLarghezze({});
    setOrdinamento(null);
    try {
      localStorage.removeItem(`tabella:${chiaveMemoria}`);
    } catch {
      /* nulla */
    }
  }, [chiaveMemoria, firma]);

  return useMemo(
    () => ({
      ordine,
      larghezze,
      ordinamento,
      trascinata,
      setTrascinata,
      iniziaResize,
      ripristinaLarghezza: (k: string) => impostaLarghezza(k, null),
      sposta,
      cliccaOrdina,
      ripristina,
    }),
    [ordine, larghezze, ordinamento, trascinata, iniziaResize, impostaLarghezza, sposta, cliccaOrdina, ripristina],
  );
}

export type ColonneTabella = ReturnType<typeof useColonneTabella>;
