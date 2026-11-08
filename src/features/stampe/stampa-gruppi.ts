/*
 * File:      stampa-gruppi.ts
 * Percorso:  src/features/stampe/stampa-gruppi.ts
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Raggruppamento dell'elenco lavoratori per reparto o per funzione di sicurezza (stampe predefinite 2 e 3).
 */
import type { RigaStampa } from "./stampa-tipi";
import { raggruppa } from "./stampa-testo";

export type RaggruppaPer = "reparto" | "funzione";
export type GruppoStampa = { titolo: string; righe: RigaStampa[] };

const ORDINE_ALFABETICO = new Intl.Collator("it", { sensitivity: "base" });

/** Tiene solo i lavoratori che hanno almeno una funzione (ruolo di sicurezza) assegnata. */
export function conFunzione(righe: RigaStampa[]): RigaStampa[] {
  return righe.filter((r) => (r.ruoliElenco?.length ?? 0) > 0);
}

/**
 * Divide le righe in gruppi, ciascuno da stampare su una pagina nuova.
 * - reparto: un gruppo per reparto, in ordine alfabetico; dentro il gruppo restano l'ordine e le scelte dell'utente.
 * - funzione: un gruppo per funzione; un lavoratore con più funzioni compare in ciascuna; chi non ne ha nessuna non compare.
 */
export function gruppiLavoratori(righe: RigaStampa[], per: RaggruppaPer): GruppoStampa[] {
  if (per === "reparto") {
    const ordinate = [...righe].sort((a, b) => ORDINE_ALFABETICO.compare(a.reparto, b.reparto));
    return raggruppa(ordinate, (r) => r.reparto).map(([reparto, rr]) => ({
      titolo: `Reparto: ${reparto} – ${rr.length} lavoratori`,
      righe: rr,
    }));
  }
  const perFunzione = new Map<string, RigaStampa[]>();
  for (const r of righe) {
    for (const f of new Set(r.ruoliElenco ?? [])) {
      const lista = perFunzione.get(f) ?? [];
      lista.push(r);
      perFunzione.set(f, lista);
    }
  }
  return [...perFunzione.entries()]
    .sort(([a], [b]) => ORDINE_ALFABETICO.compare(a, b))
    .map(([funzione, rr]) => ({ titolo: `Funzione: ${funzione} – ${rr.length} lavoratori`, righe: rr }));
}
