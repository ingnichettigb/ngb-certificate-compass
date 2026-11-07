/*
 * File:      larghezze-colonne.ts
 * Percorso:  src/features/stampe/larghezze-colonne.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Calcolo delle larghezze: adattamento alla cella più lunga (doppio clic), limiti, ripartizione in percentuale per la stampa.
 */
import type { Colonna } from "./dati-stampa";
import type { LarghezzeColonne } from "./preferenze-colonne";

export const LARGHEZZA_COLONNA_MIN = 48;
export const LARGHEZZA_COLONNA_MAX = 640;
/** Margini interni e bordo di una cella (px-1.5 a destra e sinistra + bordo). */
export const MARGINI_CELLA = 16;
/** Spazio occupato nell'intestazione da freccia di ordinamento, ✕ e distanze. */
export const SPAZIO_COMANDI_INTESTAZIONE = 44;
/** Larghezza della colonna N°. */
export const LARGHEZZA_NUMERO = 32;

export const limitaLarghezza = (px: number): number =>
  Math.round(Math.min(LARGHEZZA_COLONNA_MAX, Math.max(LARGHEZZA_COLONNA_MIN, px)));

/** Misura in pixel di un testo; il secondo parametro indica il neretto. */
export type Misura = (testo: string, grassetto: boolean) => number;

export type CellaDaMisurare = { testo: string; grassetto: boolean };

/**
 * Larghezza che fa stare tutto senza andare a capo nelle celle: il contenuto più lungo della colonna.
 * L'intestazione può andare a capo, quindi conta solo la sua parola più lunga (più lo spazio dei comandi).
 */
export function larghezzaAdattata(intestazione: string, celle: CellaDaMisurare[], misura: Misura): number {
  const cellaPiuLunga = celle.reduce((max, c) => Math.max(max, misura(c.testo, c.grassetto)), 0);
  const paroleIntestazione = intestazione.split(/\s+/).filter(Boolean);
  const parolaPiuLunga = paroleIntestazione.reduce((max, w) => Math.max(max, misura(w, true)), 0);
  return limitaLarghezza(Math.ceil(Math.max(cellaPiuLunga, parolaPiuLunga + SPAZIO_COMANDI_INTESTAZIONE)) + MARGINI_CELLA);
}

export type DimensioniTabella = {
  /** Larghezza in pixel di ogni colonna, nell'ordine di `colonne`. */
  px: number[];
  /** Stessa larghezza in percentuale del totale (la somma è 100, N° compreso): serve alla stampa. */
  percentuali: { numero: number; colonne: number[] };
  /** Larghezza totale in pixel, N° compreso. */
  totale: number;
};

/** Larghezze delle colonne: quelle scelte dall'utente, altrimenti quelle calcolate da `predefinita`. */
export function dimensioniTabella(colonne: Colonna[], scelte: LarghezzeColonne, predefinita: (c: Colonna) => number): DimensioniTabella {
  const px = colonne.map((c) => scelte[c] ?? predefinita(c));
  const totale = LARGHEZZA_NUMERO + px.reduce((a, b) => a + b, 0);
  const pct = (v: number) => Math.round((v / totale) * 10000) / 100;
  return { px, percentuali: { numero: pct(LARGHEZZA_NUMERO), colonne: px.map(pct) }, totale };
}

/** La tabella usa larghezze fisse solo se almeno una colonna visibile è stata ridimensionata; altrimenti resta com'era. */
export function haLarghezzePersonalizzate(colonne: Colonna[], scelte: LarghezzeColonne | undefined): boolean {
  return !!scelte && colonne.some((c) => scelte[c] != null);
}

/** Misura i testi con il font della tabella (canvas); fuori dal browser usa una stima. */
export function creaMisura(riferimento: HTMLElement | null): Misura {
  const stile = riferimento && typeof getComputedStyle === "function" ? getComputedStyle(riferimento) : null;
  const dimensione = stile?.fontSize || "11px";
  const famiglia = stile?.fontFamily || "ui-sans-serif, system-ui, sans-serif";
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
  } catch {
    ctx = null;
  }
  const px = parseFloat(dimensione) || 11;
  return (testo, grassetto) => {
    if (!ctx) return testo.length * px * (grassetto ? 0.62 : 0.56);
    ctx.font = `${grassetto ? 700 : 400} ${dimensione} ${famiglia}`;
    return ctx.measureText(testo).width;
  };
}
