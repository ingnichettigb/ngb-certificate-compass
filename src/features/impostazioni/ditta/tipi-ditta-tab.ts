/*
 * File:      tipi-ditta-tab.ts
 * Percorso:  src/features/impostazioni/ditta/tipi-ditta-tab.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: tipi condivisi dai riquadri della scheda Ditta. Nessun cambio di comportamento.
 */
import type { DittaRecord, calcolaSoglia } from "@/lib/api/ditta";

export type AggiornaCampo = <K extends keyof DittaRecord>(campo: K, valore: DittaRecord[K]) => void;
export type EsitoSoglia = ReturnType<typeof calcolaSoglia>;
