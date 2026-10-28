/*
 * File:      contratto.ts
 * Percorso:  src/features/contratti/contratto.ts
 * Data creaz: 28/10/2026
 * Revisioni:
 *   rev 1 — 28/10/2026 09:40 — Regole pure della gestione contrattuale (avviso scadenza, filtro stato).
 */
import { type Dipendente } from "@/lib/api";

/** Giorni di anticipo con cui un contratto determinato viene segnalato "in scadenza". */
export const GIORNI_AVVISO = 30;

export type FiltroStato = "in_forza" | "in_scadenza" | "cessati" | "tutti";

export function isCessato(d: Pick<Dipendente, "stato_lavoratore">) {
  return d.stato_lavoratore === "cessato";
}

/** Giorni mancanti alla fine del contratto determinato (negativo se già scaduto), null se non applicabile. */
export function giorniAllaFine(d: Dipendente, oggi = new Date()): number | null {
  if (isCessato(d) || d.tipo_contratto !== "determinato" || !d.data_fine_contratto) return null;
  const fine = new Date(d.data_fine_contratto + "T00:00:00");
  const base = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  return Math.round((fine.getTime() - base.getTime()) / 86_400_000);
}

/** Va mostrato l'avviso: l'operatore deve scegliere se riconfermare o terminare. */
export function richiedeDecisione(d: Dipendente, oggi = new Date()) {
  const g = giorniAllaFine(d, oggi);
  return g !== null && g <= GIORNI_AVVISO;
}

export function filtraPerStato(lista: Dipendente[], filtro: FiltroStato, oggi = new Date()) {
  switch (filtro) {
    case "in_forza":
      return lista.filter((d) => !isCessato(d));
    case "in_scadenza":
      return lista.filter((d) => richiedeDecisione(d, oggi));
    case "cessati":
      return lista.filter(isCessato);
    default:
      return lista;
  }
}
