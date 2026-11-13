/*
 * File:      righe-esempio.ts
 * Percorso:  src/features/dipendenti/import-elenco/righe-esempio.ts
 * Creato:    12/11/2026
 * Le 3 righe di esempio (nomi di fantasia) scritte nel modello Excel scaricabile. Stanno in un file a parte perché le usano
 * sia la generazione del modello sia la lettura del file: se restano nel file caricato vengono ignorate, così non entrano
 * per sbaglio nel database.
 * Revisioni:
 *   rev 1 — 12/11/2026 — Prima stesura.
 */
import type { RigaGrezza } from "./analisi-elenco";

export type EsempioModello = {
  cognome: string;
  nome: string;
  cf: string;
  luogo: string;
  nascita: Date;
  classeProfilo: string;
  /** Una voce per funzione, nell'ordine di FUNZIONI: true = X. */
  x: boolean[];
};

export const ESEMPI_MODELLO: EsempioModello[] = [
  { cognome: "ROSSI", nome: "MARIO", cf: "RSSMRA80A01H501U", luogo: "ROMA", nascita: new Date(Date.UTC(1980, 0, 1)), classeProfilo: "A027", x: [true, false, true, false, true, false] },
  { cognome: "BIANCHI", nome: "LAURA", cf: "BNCLRA85M41F205C", luogo: "MILANO", nascita: new Date(Date.UTC(1985, 7, 1)), classeProfilo: "CS", x: [false, true, true, false, true, true] },
  { cognome: "VERDI", nome: "PAOLO", cf: "VRDPLA70T10L219U", luogo: "TORINO", nascita: new Date(Date.UTC(1970, 11, 10)), classeProfilo: "DSGA", x: [true, true, false, true, false, true] },
];

const norm = (t: string | undefined) => (t ?? "").replace(/\s+/g, "").toUpperCase();

/** Vero se la riga è uno dei tre esempi del modello (stesso codice fiscale e stesso cognome). */
export function eUnaRigaDiEsempio(r: Pick<RigaGrezza, "cf" | "cognome" | "nominativo">): boolean {
  const cf = norm(r.cf);
  const cognome = norm(r.cognome ?? r.nominativo);
  return ESEMPI_MODELLO.some((e) => e.cf === cf && cognome.startsWith(e.cognome));
}

/** Toglie dal file caricato le righe di esempio del modello. */
export function scartaRigheEsempio(righe: RigaGrezza[]): RigaGrezza[] {
  return righe.filter((r) => !eUnaRigaDiEsempio(r));
}
