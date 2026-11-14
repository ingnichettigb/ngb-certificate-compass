/*
 * File:      preposti.ts
 * Percorso:  src/features/scadenze/preposti.ts
 * Data creazione: 2026-11-06
 * Revisioni:
 * - Rev 1 (2026-11-06 18:00): Applica la scadenza del motore dei cicli ai corsi Preposto, così che scheda dipendente
 *   e stampe mostrino la stessa data e lo stesso stato della pagina Scadenze (regime transitorio 19/05/2026).
 * - Rev 2 (2026-11-10): L'RSPP valido del lavoratore esonera dall'aggiornamento Preposto (esenzioni-rspp.ts).
 * - Rev 3 (2026-11-12): applicaScadenzaCicli segna gli attestati «superati» (anteriori all'ultima evidenza del gruppo: un Base
 *   rinnovato da un aggiornamento) e quelli di un gruppo «da rifare» (decaduto per ritardo); attestatiCorrenti() li scarta.
 *   Così un Base scaduto con un aggiornamento valido non risulta più scaduto in nessuna schermata.
 * - Rev 4 (2026-11-14 09:25): I corsi senza scadenza / permanenti (es. SIC-GEN) non ereditano scadenze calcolate da altri
 *   corsi del gruppo e non vengono marcati come superati o decaduti.
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
  for (const riga of costruisciRighe(preposti, oggi, attestati)) {
    if (riga.ciclo.scadenzaEffettiva) scadenzaPerGruppo.set(riga.chiave, riga.ciclo.scadenzaEffettiva);
  }

  return attestati.map((a) => {
    if (!ePreposto(a)) return a;
    const scadenza = scadenzaPerGruppo.get(chiaveGruppo(a));
    return scadenza ? { ...a, data_scadenza_calcolata: scadenza } : a;
  });
}

/** Attestato con l'esito del calcolo del suo gruppo (lavoratore + macro-categoria). */
export type AttestatoValutato = Attestato & {
  /** true se un attestato più recente del gruppo ha già coperto il ciclo (es. Base rinnovato da un aggiornamento). */
  superato?: boolean;
  /** true se il gruppo è decaduto per ritardo oltre la tolleranza: serve un nuovo corso base. */
  daRifareBase?: boolean;
  /** Ultimo giorno utile per sanare con un aggiornamento (solo corsi con tolleranza). */
  limiteRecupero?: string | null;
};

/**
 * Come applicaScadenzaPreposti, ma per TUTTI i corsi: la scadenza di ogni attestato è quella del ciclo del suo gruppo
 * (lavoratore + macro-categoria: corso base più aggiornamenti), cioè la stessa della pagina Scadenze.
 * Se il motore non dà una scadenza (corso senza durata) resta quella salvata sull'attestato.
 * Gli attestati anteriori all'ultima evidenza del gruppo sono marcati `superato`: non sono mai «scaduti» di per sé.
 */
export function applicaScadenzaCicli(attestati: Attestato[], oggi: Date = new Date()): AttestatoValutato[] {
  if (attestati.length === 0) return attestati;
  const perGruppo = new Map<
    string,
    { scadenza: string; ultimaEvidenza: string | null; daRifareBase: boolean; limiteRecupero: string | null }
  >();
  for (const riga of costruisciRighe(attestati, oggi)) {
    if (!riga.ciclo.scadenzaEffettiva) continue;
    perGruppo.set(riga.chiave, {
      scadenza: riga.ciclo.scadenzaEffettiva,
      ultimaEvidenza: riga.ciclo.dataUltimaEvidenza,
      daRifareBase: !!riga.ciclo.decadutoPerRitardo,
      limiteRecupero: riga.ciclo.limiteRecupero ?? null,
    });
  }
  return attestati.map((a) => {
    const cod = (a.tipi_corso?.codice ?? "").trim().toUpperCase();
    const ePermanente =
      cod.startsWith("SIC-GEN") ||
      (a.tipi_corso?.durata_validita_anni == null &&
        !a.tipi_corso?.codice_corso_aggiornamento &&
        !a.tipi_corso?.anni_aggiornamento);
    const g = perGruppo.get(chiaveGruppo(a));
    if (!g) return a;
    const data = (a.data_corso ?? "").slice(0, 10);
    const valutato: AttestatoValutato = {
      ...a,
      data_scadenza_calcolata: ePermanente ? null : g.scadenza,
    };
    if (g.ultimaEvidenza && data && data < g.ultimaEvidenza && !ePermanente) valutato.superato = true;
    if (g.daRifareBase && !ePermanente) valutato.daRifareBase = true;
    if (g.limiteRecupero && !ePermanente) valutato.limiteRecupero = g.limiteRecupero;
    return valutato;
  });
}

/** Solo gli attestati che contano oggi per le scadenze: esclude i «superati» (un Base rinnovato non è uno scaduto). */
export function attestatiCorrenti(attestati: Attestato[], oggi: Date = new Date()): AttestatoValutato[] {
  return applicaScadenzaCicli(attestati, oggi).filter((a) => !a.superato);
}
