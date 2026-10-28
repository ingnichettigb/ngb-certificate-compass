/*
 * File:          types.ts
 * Percorso:      src/features/hr/types.ts
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Costanti filtri per stato.
 *   - Rev 2 (2026-10-28 10:55): Aggiunto filtro «Senza PDF».
 *   - Rev 3 (2026-10-28 11:50): Aggiunto filtro «In attesa di integrazione».
 */
import { type FiltroAttestati } from "@/lib/api";

export type FiltroHr = FiltroAttestati;

/** Filtri selezionabili nella lista. */
export const FILTRI: FiltroHr[] = [
  "In attesa",
  "In attesa di integrazione",
  "Approvato",
  "Respinto",
  "Senza PDF",
  "Tutti",
];
