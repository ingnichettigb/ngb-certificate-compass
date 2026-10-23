/*
 * File:      types.ts
 * Percorso:  src/features/hr/types.ts
 * Costanti della dashboard HR.
 */
import { type Stato } from "@/lib/api";

/** Stati selezionabili nei filtri della lista. */
export const FILTRI: (Stato | "Tutti")[] = ["In attesa", "Approvato", "Respinto", "Tutti"];
