/*
 * File:      preposti.ts
 * Percorso:  src/features/scadenze/preposti.ts
 * Data creazione: 2026-11-06
 * Revisioni:
 * - Rev 1 (2026-11-06 18:00): Applica la scadenza del motore dei cicli ai corsi Preposto, così che scheda dipendente
 *   e stampe mostrino la stessa data e lo stesso stato della pagina Scadenze (regime transitorio 19/05/2026).
 *
 * Funzione pura. Gli attestati non Preposto sono restituiti identici (stessi oggetti).
 * Tutti gli attestati dello stesso lavoratore e gruppo Preposto ricevono la scadenza del gruppo: è il ciclo
 * (non il singolo attestato) a essere valido o scaduto.
 */
import type { Attestato } from "@/lib/api";
import { chiaveGruppo, costruisciRighe, ePreposto } from "./raggruppa";

export function applicaScadenzaPreposti(attestati: Attestato[], oggi: Date = new Date()): Attestato[] {
  const preposti = attestati.filter(ePreposto);
  if (preposti.length === 0) return attestati;

  const scadenzaPerGruppo = new Map<string, string>();
  for (const riga of costruisciRighe(preposti, oggi)) {
    if (riga.ciclo.scadenzaEffettiva) scadenzaPerGruppo.set(riga.chiave, riga.ciclo.scadenzaEffettiva);
  }

  return attestati.map((a) => {
    if (!ePreposto(a)) return a;
    const scadenza = scadenzaPerGruppo.get(chiaveGruppo(a));
    return scadenza ? { ...a, data_scadenza_calcolata: scadenza } : a;
  });
}
