/*
 * File:          types.ts
 * Percorso:      src/features/hr/types.ts
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Costanti filtri per stato.
 *   - Rev 2 (2026-10-28 10:55): Aggiunto filtro «Senza PDF».
 */
import { type FiltroAttestati } from "@/lib/api";

export type FiltroHr = FiltroAttestati;

/** Filtri selezionabili nella lista. */
export const FILTRI: FiltroHr[] = ["In attesa", "Approvato", "Respinto", "Senza PDF", "Tutti"];
