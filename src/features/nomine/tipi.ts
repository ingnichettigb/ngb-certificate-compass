/*
 * File:      tipi.ts
 * Percorso:  src/features/nomine/tipi.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Tipi delle nomine, elenco dei bottoni della pagina Nomine e segnaposto disponibili nei modelli.
 *   rev 2 — 16/11/2026 — Registro antincendio, DPI e SDS: «ruoloDb» = ruolo di ruoli_sicurezza da cui si leggono (e in cui si scrivono) i nominati.
 */
import { NOME_RUOLO_DPI, NOME_RUOLO_REGISTRO, NOME_RUOLO_SDS } from "@/features/stampe/ruoli-organigramma";

export type TipoNomina =
  | "primo-soccorso"
  | "antincendio"
  | "evacuazione"
  | "registro-antincendio"
  | "dpi"
  | "sds"
  | "dae"
  | "preposto";

/** Modello di una nomina: tutti i testi si possono modificare dalla pagina e restano salvati nel database. */
export type ModelloNomina = {
  tipo: TipoNomina;
  /** Titolo in alto sul documento (maiuscolo). */
  titolo: string;
  /** Riga «Oggetto: …». */
  oggetto: string;
  /** Paragrafi iniziali separati da una riga vuota. Ammessi i segnaposto {{…}}. */
  introduzione: string;
  /**
   * Compiti, una riga per voce. Prefissi: «# » sottotitolo, «- » elenco puntato, «> » testo rientrato; senza prefisso = voce numerata.
   */
  corpo: string;
  /** Paragrafi finali (prima dei saluti) separati da una riga vuota. */
  chiusura: string;
  /** Righe sotto la firma del dirigente (es. «f.to Digitalmente»), una per riga. */
  nota_firma: string;
  /** Scritta accanto alla firma del nominato (es. «Per presa visione»). */
  etichetta_firma: string;
  /** Se presente, aggiunge le tre dichiarazioni sulla formazione per questa figura (es. «ADDETTO AL PRIMO SOCCORSO»). */
  formazione: string;
  updated_at?: string | null;
};

export type VoceElencoNomine = {
  tipo: TipoNomina;
  label: string;
  descrizione: string;
  /** Come si ricavano i nominativi dall'organigramma. */
  sorgente: { ruolo: string } | { voce: RegExp };
  /**
   * Nome esatto del ruolo del DB (ruoli_sicurezza) che contiene i nominati. Se presente la lista è modificabile anche
   * dalle Nomine (aggiungi/togli) e coincide con la voce dell'organigramma collegata allo stesso ruolo.
   */
  ruoloDb?: string;
};

/** Bottoni della pagina Nomine, nell'ordine mostrato. */
export const ELENCO_NOMINE: VoceElencoNomine[] = [
  {
    tipo: "primo-soccorso",
    label: "Primo soccorso",
    descrizione: "Addetti all'attuazione del primo soccorso.",
    sorgente: { ruolo: "primo-soccorso" },
  },
  {
    tipo: "antincendio",
    label: "Antincendio",
    descrizione: "Addetti a prevenzione incendi e lotta antincendio.",
    sorgente: { ruolo: "antincendio" },
  },
  {
    tipo: "evacuazione",
    label: "Evacuazione",
    descrizione: "Addetti all'attuazione dell'evacuazione.",
    sorgente: { ruolo: "evacuazione" },
  },
  {
    tipo: "registro-antincendio",
    label: "Registro antincendio",
    descrizione: "Incaricati della gestione del registro antincendio.",
    sorgente: { voce: /registro\s+antincendio/i },
    ruoloDb: NOME_RUOLO_REGISTRO,
  },
  {
    tipo: "dpi",
    label: "Distribuzione DPI",
    descrizione: "Incaricati della distribuzione e custodia dei DPI.",
    sorgente: { voce: /\bdpi\b|protezione\s+individuale/i },
    ruoloDb: NOME_RUOLO_DPI,
  },
  {
    tipo: "sds",
    label: "Custodia SDS",
    descrizione: "Incaricati della distribuzione e custodia delle schede di sicurezza.",
    sorgente: { voce: /\bsds\b|schede\s+di\s+sicurezza/i },
    ruoloDb: NOME_RUOLO_SDS,
  },
  {
    tipo: "dae",
    label: "Defibrillatore (DAE)",
    descrizione: "Addetti all'uso del defibrillatore.",
    sorgente: { ruolo: "defibrillatore" },
  },
  {
    tipo: "preposto",
    label: "Preposto",
    descrizione: "Preposti alla sicurezza (art. 19 D.Lgs. 81/08).",
    sorgente: { ruolo: "preposti" },
  },
];

export function voceElenco(tipo: string): VoceElencoNomine | undefined {
  return ELENCO_NOMINE.find((v) => v.tipo === tipo);
}

/** Segnaposto sostituiti al momento dell'anteprima e della stampa. */
export const SEGNAPOSTO: { chiave: string; descrizione: string }[] = [
  { chiave: "nome", descrizione: "Cognome e nome del nominato" },
  { chiave: "anno", descrizione: "Anno scolastico/di lavoro (es. 2026-2027)" },
  { chiave: "protocollo", descrizione: "Numero di protocollo" },
  { chiave: "data", descrizione: "Data della nomina" },
  { chiave: "luogo", descrizione: "Comune della ditta" },
  { chiave: "sede", descrizione: "Plesso scelto nella pagina (vuoto con «Tutte le sedi»)" },
  { chiave: "istituto", descrizione: "Ragione sociale della ditta" },
  { chiave: "firmatario", descrizione: "Datore di lavoro / Dirigente" },
  {
    chiave: "qualifica_firmatario",
    descrizione: "«Il Dirigente Scolastico» o «Il Datore di Lavoro»",
  },
];
