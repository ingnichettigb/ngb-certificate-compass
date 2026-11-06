/*
 * File:      types.ts
 * Percorso:  src/features/scadenze/types.ts
 * Data creazione: 2026-10-15
 * Revisioni:
 * - Rev 1 (2026-10-15 10:00): Struttura base tipi per la pagina Scadenze.
 * - Rev 2 (2026-11-06 12:00): Stati di conformità ciclo, decadenza, monte ore frazionato e riga raggruppata.
 */
import type { Attestato } from "@/lib/api";

export type Vista =
  | "Scaduti"
  | "Decaduti (> 10 anni)"
  | "In scadenza (90 gg)"
  | "In scadenza (6 mesi)"
  | "In scadenza (1 anno)"
  | "Ore parziali"
  | "Tutti con scadenza";

export type StatoConformita =
  | "valido"
  | "in_scadenza"
  | "scaduto_sanabile"
  | "decaduto"
  | "incompleto_ore"
  | "senza_scadenza";

export interface PosizioneCiclo {
  /** Data del Corso Base che ancora i cicli. */
  dataAncora: string | null;
  /** Fine del primo ciclo non ancora coperto (scadenza da rispettare). */
  scadenzaEffettiva: string | null;
  oreRichieste: number;
  /** Ore di aggiornamento già accumulate ma non ancora sufficienti. */
  oreAccumulate: number;
  stato: StatoConformita;
  giorniAllaScadenza: number | null;
  anniDallUltimoCorso: number;
  richiedeNuovoCorsoBase: boolean;
  /** Data del Base o dell'ultimo aggiornamento che ha completato il monte ore. */
  dataUltimaEvidenza: string | null;
  /** true se almeno un aggiornamento contato non ha ore dichiarate (ore stimate o mancanti). */
  oreDaVerificare: boolean;
  /** Aggiornamenti non contati (decaduti, in eccesso, futuri o tardivi non ammessi). */
  aggiornamentiIgnorati: number;
}

/** Una riga della tabella: un lavoratore + un corso (o macro-categoria), non un singolo attestato. */
export interface RigaScadenzaDati {
  chiave: string;
  /** Attestato più recente del gruppo (usato per mostrare dati del dipendente e del corso). */
  attestato: Attestato;
  attestatiGruppo: Attestato[];
  ciclo: PosizioneCiclo;
}

export type ColonnaSort =
  | "dipendente"
  | "codice_fiscale"
  | "reparto"
  | "corso"
  | "data_corso"
  | "scadenza"
  | "stato";

export type { DirezioneSort } from "@/components/IntestazioneOrdinabile";

export const TUTTI = "__tutti__";
