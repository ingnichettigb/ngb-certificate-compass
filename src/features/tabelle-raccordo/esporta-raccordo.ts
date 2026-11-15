/*
 * File:      esporta-raccordo.ts
 * Percorso:  src/features/tabelle-raccordo/esporta-raccordo.ts
 * Data creaz: 15/11/2026
 * Revisioni:
 *   rev 1 — 15/11/2026 10:50 — Dati da esportare di una tabella di raccordo: colonna N, colonne nell'ordine mostrato, «Applica»;
 *            righe nell'ordinamento a schermo; sì/no per i campi vero/falso, numeri veri per i numeri.
 */
import {
  nomeBaseDa,
  type TabellaDaEsportare,
  type ValoreCella,
} from "@/components/tabella-comune/esporta-tabella";
import type { Colonna, DefinizioneTabella, Riga } from "./definizioni";

/** Valore di una cella da esportare, secondo il tipo della colonna. */
export function valoreDaEsportare(c: Colonna, v: unknown): ValoreCella {
  if (v === null || v === undefined || v === "") return c.tipo === "bool" ? false : null;
  if (c.tipo === "bool") return Boolean(v);
  if (c.tipo === "numero") {
    const n = Number(v);
    return Number.isFinite(n) ? n : String(v);
  }
  return String(v);
}

/**
 * @param visibili colonne nell'ordine scelto a schermo
 * @param righe    tutti i record, già nell'ordinamento a schermo
 */
export function tabellaRaccordoDaEsportare(
  def: DefinizioneTabella,
  visibili: Colonna[],
  righe: Riga[],
): TabellaDaEsportare {
  return {
    nomeBase: `raccordo-${def.numero}-${nomeBaseDa(def.titolo)}`,
    foglio: `${def.numero} ${def.titolo}`,
    intestazioni: ["N", ...visibili.map((c) => c.etichetta), "Applica"],
    righe: righe.map((r, i) => [
      i + 1,
      ...visibili.map((c) => valoreDaEsportare(c, r[c.chiave])),
      Boolean(r["applica"]),
    ]),
  };
}
