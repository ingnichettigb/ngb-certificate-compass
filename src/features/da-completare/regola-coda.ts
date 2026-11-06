/*
 * File:      regola-coda.ts
 * Percorso:  src/features/da-completare/regola-coda.ts
 * Creato:    05/11/2026
 * Regola della coda «Da completare»: finiscono in coda i lavoratori in forza che
 *   1) sono arrivati dal 1 settembre dell'anno scolastico in corso e hanno dati mancanti, oppure
 *   2) sono «tornati»: riabilitati dai cessati, riconoscibili perché da in forza hanno ancora
 *      una data di cessazione (il salvataggio dalla scheda la azzera, e il lavoratore esce dalla coda).
 * I dati mancanti sono quelli della regola unica in dipendenti/anagrafica-completa.ts.
 * Logica pura, senza database.
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura.
 */
import type { Dipendente } from "@/lib/api";
import { campiMancanti } from "@/features/dipendenti/anagrafica-completa";

/** 1 settembre dell'anno scolastico in corso (formato ISO): da settembre in poi quello dell'anno corrente. */
export function inizioAnnoScolastico(oggi = new Date()): string {
  const anno = oggi.getMonth() >= 8 ? oggi.getFullYear() : oggi.getFullYear() - 1;
  return `${anno}-09-01`;
}

/** Assunto dal 1 settembre dell'anno scolastico in corso. */
export function eNuovoDellAnno(d: Pick<Dipendente, "data_assunzione">, oggi = new Date()): boolean {
  return !!d.data_assunzione && d.data_assunzione.slice(0, 10) >= inizioAnnoScolastico(oggi);
}

/** Riabilitato: è in forza ma ha ancora la data di cessazione di quando era cessato. */
export function eTornato(d: Pick<Dipendente, "stato_lavoratore" | "data_cessazione">): boolean {
  return d.stato_lavoratore !== "cessato" && !!d.data_cessazione?.trim();
}

export function inCodaDaCompletare(d: Dipendente, oggi = new Date()): boolean {
  if (d.stato_lavoratore === "cessato") return false;
  if (eTornato(d)) return true;
  return eNuovoDellAnno(d, oggi) && campiMancanti(d).length > 0;
}
