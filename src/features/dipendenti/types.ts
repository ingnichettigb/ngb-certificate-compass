/*
 * File:          types.ts
 * Percorso:      src/features/dipendenti/types.ts
 * Data creazione: 2026-10-24
 * Revisioni:
 *   - Rev 1 (2026-10-24 16:30): Costanti e tipi base della pagina Dipendenti.
 *   - Rev 2 (2026-11-06 18:37): Aggiunta colonna ordinabile "ore" e proprietà ore in RigaAttestato.
 */
import { type Attestato, type Dipendente, type IntegrazioneDvr } from "@/lib/api";

export const TUTTI = "__tutti__";
export const NESSUNO = "__nessuno__";

export type ColonnaSortAttestati = "corso" | "data" | "scadenza" | "ore" | "stato";
export type { DirezioneSort } from "@/components/IntestazioneOrdinabile";

export const VUOTO: Omit<Dipendente, "id"> = {
  codice_fiscale: "",
  cognome: "",
  nome: "",
  email: "",
  reparto: "",
  sottoreparto: "",
  classe_concorso: "",
  materia: "",
  luogo_nascita: "",
  data_nascita: "",
  codice_ateco: "",
  tipo_contratto: "indeterminato",
  data_assunzione: "",
  data_fine_contratto: "",
  note_contratto: "",
};

/** Riga della tabella «Tutti gli attestati»: un attestato oppure un'integrazione DVR. */
export type RigaAttestato = {
  id: string;
  isAttestato: boolean;
  corso: string;
  data: string | null;
  scadenza: string | null;
  ore?: number | null;
  stato: string;
  attestato?: Attestato;
  integrazione?: IntegrazioneDvr;
};
