/*
 * File:      types.ts
 * Percorso:  src/features/carica/types.ts
 * Tipi e valori iniziali del modulo di invio attestato.
 */

/** Livelli di un corso, nell'ordine mostrato al lavoratore. */
export const LIVELLI = ["Base", "Specifico", "Aggiornamento"] as const;

/** Dati anagrafici inseriti dal lavoratore. */
export interface Anagrafica {
  codice_fiscale: string;
  cognome: string;
  nome: string;
  email: string;
  reparto: string;
  sottoreparto: string;
  classe_concorso: string;
  materia: string;
  luogo_nascita: string;
  data_nascita: string;
}

export const ANAGRAFICA_VUOTA: Anagrafica = {
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
};
