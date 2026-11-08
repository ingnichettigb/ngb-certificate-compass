/*
 * File:      stampa-gruppi.ts
 * Percorso:  src/features/stampe/stampa-gruppi.ts
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Raggruppamento dell'elenco lavoratori per reparto o per funzione di sicurezza (stampe predefinite 2 e 3).
 *   rev 2 — 08/11/2026 14:30 — Supporto filtro singola funzione (soloFunzione) ed elenco delle funzioni con conteggio lavoratori per le pillole di selezione rapida.
 */
import type { RigaStampa } from "./stampa-tipi";
import { raggruppa } from "./stampa-testo";

export type RaggruppaPer = "reparto" | "funzione";
export type GruppoStampa = { titolo: string; righe: RigaStampa[] };
export type InfoFunzione = { nome: string; conteggio: number };

const ORDINE_ALFABETICO = new Intl.Collator("it", { sensitivity: "base" });

/** Tiene solo i lavoratori che hanno almeno una funzione (ruolo di sicurezza) assegnata. */
export function conFunzione(righe: RigaStampa[]): RigaStampa[] {
  return righe.filter((r) => (r.ruoliElenco?.length ?? 0) > 0);
}

/**
 * Ricava l'elenco distinto di tutte le funzioni di sicurezza presenti nei lavoratori,
 * ciascuna con il numero totale di lavoratori che la ricoprono.
 */
export function elencoFunzioni(righe: RigaStampa[]): InfoFunzione[] {
  const conteggi = new Map<string, number>();
  for (const r of righe) {
    for (const f of new Set(r.ruoliElenco ?? [])) {
      conteggi.set(f, (conteggi.get(f) ?? 0) + 1);
    }
  }
  return [...conteggi.entries()]
    .sort(([a], [b]) => ORDINE_ALFABETICO.compare(a, b))
    .map(([nome, conteggio]) => ({ nome, conteggio }));
}

/**
 * Divide le righe in gruppi, ciascuno da stampare su una pagina nuova.
 * - reparto: un gruppo per reparto, in ordine alfabetico; dentro il gruppo restano l'ordine e le scelte dell'utente.
 * - funzione: un gruppo per funzione (oppure solo quello della funzione scelta); chi non ne ha nessuna non compare.
 */
export function gruppiLavoratori(righe: RigaStampa[], per: RaggruppaPer, soloFunzione?: string | null): GruppoStampa[] {
  if (per === "reparto") {
    const ordinate = [...righe].sort((a, b) => ORDINE_ALFABETICO.compare(a.reparto, b.reparto));
    return raggruppa(ordinate, (r) => r.reparto).map(([reparto, rr]) => ({
      titolo: `Reparto: ${reparto} – ${rr.length} lavoratori`,
      righe: rr,
    }));
  }

  // Se è selezionata una specifica funzione, mostra solo quella sezione
  if (soloFunzione) {
    const filtrate = righe.filter((r) => r.ruoliElenco?.includes(soloFunzione));
    return [{ titolo: `Funzione: ${soloFunzione} – ${filtrate.length} lavoratori`, righe: filtrate }];
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
