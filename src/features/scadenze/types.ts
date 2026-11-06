/*
 * File:      types.ts
 * Percorso:  src/features/scadenze/types.ts
 * Data creazione: 2026-10-15
 * Revisioni:
 * - Rev 1 (2026-10-15 10:00): Struttura base tipi per la pagina Scadenze.
 * - Rev 2 (2026-11-06 12:00): Stati di conformità ciclo, decadenza, monte ore frazionato e riga raggruppata.
 * - Rev 3 (2026-11-06 14:00): Cicli ed eventi già calcolati dal motore per la linea temporale.
 * - Rev 4 (2026-11-06 16:00): dataTaglio e scadenzaPortataAlTaglio (regime transitorio Preposti).
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
  "valido" | "in_scadenza" | "scaduto_sanabile" | "decaduto" | "incompleto_ore" | "senza_scadenza";

/** Stato di un singolo ciclo nella linea temporale. */
export type StatoCiclo = "completato" | "da_completare" | "scaduto" | "futuro" | "decaduto";

export type TipoEvento = "base" | "parziale" | "completo" | "ignorato";

export type MotivoIgnorato = "decaduto" | "in_eccesso" | "futuro" | "tardivo_non_ammesso";

export interface CicloVisuale {
  /** Numero del ciclo, da 1. */
  indice: number;
  inizio: string;
  fine: string;
  stato: StatoCiclo;
  /** Ore accumulate: valorizzate solo sul ciclo che definisce la scadenza (attivo). */
  oreAccumulate: number;
  oreRichieste: number;
  /** true per il primo ciclo non ancora coperto, quello che definisce la scadenza. */
  attivo: boolean;
}

export interface EventoCiclo {
  id: string | number;
  data: string;
  ore: number | null;
  tipo: TipoEvento;
  /** Solo per tipo = "ignorato". */
  motivo?: MotivoIgnorato;
}

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
  /** Durata del ciclo in anni (0 = senza scadenza). */
  durataCicloAnni: number;
  /** Data usata per la valutazione (YYYY-MM-DD): è anche la posizione di "Oggi" nel grafico. */
  dataValutazione: string;
  /** Data di taglio applicata (es. 19/05/2026 per i Preposti); null se non prevista. */
  dataTaglio: string | null;
  /** true se la scadenza mostrata è stata portata alla data di taglio (la fine ciclo rigida era anteriore). */
  scadenzaPortataAlTaglio: boolean;
  /** Cicli da disegnare: dal primo al ciclo di oggi, più il successivo non ancora attivo. */
  cicli: CicloVisuale[];
  /** Base e aggiornamenti classificati dal motore (contati, parziali, completi, ignorati). */
  eventi: EventoCiclo[];
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
  "dipendente" | "codice_fiscale" | "reparto" | "corso" | "data_corso" | "scadenza" | "stato";

export type { DirezioneSort } from "@/components/IntestazioneOrdinabile";

export const TUTTI = "__tutti__";
