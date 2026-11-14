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
 * - Rev 5 (2026-11-14): «Permanente» vale solo per la Formazione generale (SIC-GEN, eCorsoGenerale): un tipo di corso configurato
 *   male (senza durata) non diventa più senza scadenza in silenzio. L'attestato Preposto di chi è esonerato dall'aggiornamento
 *   per RSPP/ASPP valido riceve `esenzioneRspp` (motivo), così le stampe lo indicano.
 *
 * Funzione pura. Gli attestati non Preposto sono restituiti identici (stessi oggetti).
 * Tutti gli attestati dello stesso lavoratore e gruppo Preposto ricevono la scadenza del gruppo: è il ciclo
 * (non il singolo attestato) a essere valido o scaduto.
 */
import type { Attestato } from "@/lib/api";
import { chiaveGruppo, costruisciRighe, eCorsoGenerale, ePreposto } from "./raggruppa";

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
  /** Motivo dell'esonero dall'aggiornamento Preposto (RSPP/ASPP valido); assente se il lavoratore non è esonerato. */
  esenzioneRspp?: string;
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
    {
      scadenza: string | null;
      ultimaEvidenza: string | null;
      daRifareBase: boolean;
      limiteRecupero: string | null;
      esenzione: string | null;
    }
  >();
  for (const riga of costruisciRighe(attestati, oggi)) {
    const esenzione = riga.ciclo.esenteRspp ? riga.ciclo.motivoScadenza : null;
    // Con RSPP senza scadenza il ciclo Preposto non ha una data: si deve comunque indicare l'esonero.
    if (!riga.ciclo.scadenzaEffettiva && !esenzione) continue;
    perGruppo.set(riga.chiave, {
      scadenza: riga.ciclo.scadenzaEffettiva,
      esenzione,
      ultimaEvidenza: riga.ciclo.dataUltimaEvidenza,
      daRifareBase: !!riga.ciclo.decadutoPerRitardo,
      limiteRecupero: riga.ciclo.limiteRecupero ?? null,
    });
  }
  return attestati.map((a) => {
    // Permanente = solo la Formazione generale (SIC-GEN). Un corso senza durata configurata NON è permanente.
    const ePermanente = eCorsoGenerale(a.tipi_corso);
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
    if (g.esenzione && ePreposto(a)) valutato.esenzioneRspp = g.esenzione;
    return valutato;
  });
}

/** Solo gli attestati che contano oggi per le scadenze: esclude i «superati» (un Base rinnovato non è uno scaduto). */
export function attestatiCorrenti(attestati: Attestato[], oggi: Date = new Date()): AttestatoValutato[] {
  return applicaScadenzaCicli(attestati, oggi).filter((a) => !a.superato);
}
