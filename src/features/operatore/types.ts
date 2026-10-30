/*
 * File:      types.ts
 * Percorso:  src/features/operatore/types.ts
 * Tipi e valori iniziali della Postazione Operatore.
 * Revisioni:
 *   - Rev 2 (2026-10-30 10:40): Campo numero_attestato.
 */

export interface TipoCorso {
  id: string;
  nome_corso: string;
  macro_categoria: string;
  livello_specifico: string;
  ore_minime_legge: number | null;
  codice?: string | null;
  durata_validita_anni: number | null;
}

export interface Riga {
  id: string;
  cognome: string;
  nome: string;
  codice_fiscale: string;
  data_nascita: string;
  luogo_nascita: string;
  codice_ateco: string;
  email: string;
  reparto: string;
  tipo_corso_id: string | null;
  tipo_corso_nome: string;
  /** Solo nel modulo: non è una colonna della coda (ricavato da tipo_corso_id). */
  tipo_corso_codice?: string | null | undefined;
  data_corso: string;
  /** Numero/protocollo dell'attestato; se vuoto si genera AAMMGG-CODICE. */
  numero_attestato: string;
  ore: number | null;
  ente: string;
  argomenti: string[];
  esito: "Valido" | "Valido con integrazione DVR" | "Non valido";
  note: string;
  integrazione: string;
  pagine_salvate?: string;
  file_blob?: Blob;
  nome_file_originale?: string;
}

export type CodaRiga = Omit<Riga, "esito"> & {
  esito: string;
  percorso_file: string | null;
  mime_file: string | null;
  nome_file: string | null;
  archiviato: boolean;
  inviato: boolean;
  argomenti_mancanti: string[];
};

export type CampoOcr = "cognome" | "nome" | "codice_fiscale" | "email" | "codice_ateco" | "data_corso" | "ore" | "note" | "numero_attestato";

export const VUOTA: Omit<Riga, "id"> = {
  cognome: "", nome: "", codice_fiscale: "", data_nascita: "", luogo_nascita: "", codice_ateco: "",
  email: "", reparto: "", tipo_corso_id: null, tipo_corso_nome: "", data_corso: "", numero_attestato: "", ore: null,
  ente: "", argomenti: [], esito: "Valido", note: "", integrazione: "",
};

export const NOTA_PREDEFINITA = "Attestato conforme ai requisiti previsti dall'Accordo Stato-Regioni.";

/** Stato della finestra di anteprima/invio email. */
export interface StatoModaleEmail {
  aperta: boolean;
  righe: CodaRiga[];
  destinatari: string;
  oggetto: string;
  testoCorpo: string;
}
