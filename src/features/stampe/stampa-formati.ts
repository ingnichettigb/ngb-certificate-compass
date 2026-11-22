/*
 * File:      stampa-formati.ts
 * Percorso:  src/features/stampe/stampa-formati.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da dati-stampa.ts: formato data italiano ed etichette di stato e modello
 *            (senza dipendenze dagli altri file di stampa, per evitare giri circolari).
 *   rev 2 — 22/11/2026 — GIORNI_PREAVVISO_STAMPE = 270 (9 mesi): da quando un corso non ancora scaduto risulta «In scadenza».
 */
import type { Modello, StatoValidita } from "./stampa-tipi";

/** Giorni prima della scadenza da cui il corso risulta «In scadenza» (arancione) nelle stampe: 9 mesi. Prima: «Valido». */
export const GIORNI_PREAVVISO_STAMPE = 270;

export function dataIt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export const ETICHETTA_STATO: Record<StatoValidita, string> = {
  valido: "Valido",
  in_scadenza: "In scadenza",
  scaduto: "Scaduto",
  senza_scadenza: "Senza scadenza",
  manca: "Manca",
};

export const TITOLI_MODELLO: Record<Modello, string> = {
  registro: "Registro integrale della formazione",
  gruppo: "Elenco incaricati per gruppo",
  scadenze: "Scadenzario corsi",
  scheda: "Scheda formativa individuale",
  reparto: "Report formazione per reparto",
  lavoratori: "Elenco lavoratori in servizio",
};
