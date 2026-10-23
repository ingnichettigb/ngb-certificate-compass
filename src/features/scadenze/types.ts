/*
 * File:      types.ts
 * Percorso:  src/features/scadenze/types.ts
 * Tipi e costanti della pagina Scadenze.
 */

export type Vista =
  | "Scaduti"
  | "In scadenza (90 gg)"
  | "In scadenza (6 mesi)"
  | "In scadenza (1 anno)"
  | "Tutti con scadenza";

export type ColonnaSort =
  | "dipendente"
  | "codice_fiscale"
  | "reparto"
  | "corso"
  | "data_corso"
  | "scadenza";

export type { DirezioneSort } from "@/components/IntestazioneOrdinabile";

export const TUTTI = "__tutti__";
