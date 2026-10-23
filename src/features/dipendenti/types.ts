/*
 * File:      types.ts
 * Percorso:  src/features/dipendenti/types.ts
 * Costanti e tipi della pagina Dipendenti.
 */
import { type Attestato, type Dipendente, type IntegrazioneDvr } from "@/lib/api";

export const TUTTI = "__tutti__";
export const NESSUNO = "__nessuno__";

export type ColonnaSortAttestati = "corso" | "data" | "scadenza" | "stato";
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
};

/** Riga della tabella «Tutti gli attestati»: un attestato oppure un'integrazione DVR. */
export type RigaAttestato = {
  id: string;
  isAttestato: boolean;
  corso: string;
  data: string | null;
  scadenza: string | null;
  stato: string;
  attestato?: Attestato;
  integrazione?: IntegrazioneDvr;
};

