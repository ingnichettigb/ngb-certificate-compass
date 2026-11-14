/*
 * File:      copertura-squadre.ts
 * Percorso:  src/features/stampe/copertura-squadre.ts
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 — Squadre obbligatorie di una sede senza addetti, o con addetti tutti «da formare» (nessun attestato valido).
 *            Funzione pura: la pagina dell'organigramma la mostra come avviso quando è scelta una sede.
 */
import type { BloccoOrganigramma } from "./organigramma-a3";

/** Squadre che devono avere addetti formati in ogni luogo di lavoro. */
export const SQUADRE_OBBLIGATORIE = ["primo-soccorso", "antincendio"] as const;

export type AvvisoCopertura = {
  chiave: string;
  titolo: string;
  motivo: "nessun-addetto" | "nessun-formato";
};

export function squadreScoperte(blocchi: BloccoOrganigramma[]): AvvisoCopertura[] {
  const out: AvvisoCopertura[] = [];
  for (const chiave of SQUADRE_OBBLIGATORIE) {
    const b = blocchi.find((x) => x.chiave === chiave);
    if (!b) continue;
    const membri = [...b.ata, ...b.docenti];
    if (!membri.length) out.push({ chiave, titolo: b.titolo, motivo: "nessun-addetto" });
    else if (membri.every((m) => m.daFormare)) out.push({ chiave, titolo: b.titolo, motivo: "nessun-formato" });
  }
  return out;
}
