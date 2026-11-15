/*
 * File:      presenze-sedi.ts
 * Percorso:  src/features/ditta/presenze-sedi.ts
 * Data creaz: 15/11/2026
 * Revisioni:
 *   rev 1 — 15/11/2026 — Calcoli puri: totale presenze di tutte le sedi e numero lavoratori di riferimento (principio più cautelativo).
 *   rev 2 — 15/11/2026 — DICITURA_PERSONE_MAX spostata qui (usata da riquadro Sedi e finestra Modifica sede senza import circolari).
 */

/** Dicitura unica richiesta per ogni sede e plesso. */
export const DICITURA_PERSONE_MAX =
  "Massimo numero di presenti nel plesso (tutti compresi i lavoratori, studenti, ospiti e utenza)";

export type SedePresenze = {
  id: string;
  nome: string;
  is_principale: boolean;
  attiva: boolean;
  persone_max: number | null;
};

export type RiepilogoPresenze = {
  /** Presenze della sede principale (null = non compilate). */
  sedeCentrale: number | null;
  /** Somma delle presenze dei plessi attivi (solo valori compilati). */
  plessi: number;
  /** Somma di tutte le sedi attive (solo valori compilati). */
  totale: number;
  /** true se TUTTE le sedi attive hanno il valore: solo allora il totale può sostituire il dato manuale. */
  completo: boolean;
  /** Nomi delle sedi attive senza valore. */
  mancanti: string[];
};

const valido = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

export function riepilogaPresenze(sedi: SedePresenze[]): RiepilogoPresenze {
  const attive = sedi.filter((s) => s.attiva);
  const centrale = attive.find((s) => s.is_principale);
  const plessi = attive.filter((s) => !s.is_principale);
  const somma = (xs: SedePresenze[]) =>
    xs.reduce((acc, s) => acc + (valido(s.persone_max) ? s.persone_max : 0), 0);
  const mancanti = attive.filter((s) => !valido(s.persone_max)).map((s) => s.nome);
  return {
    sedeCentrale: centrale && valido(centrale.persone_max) ? centrale.persone_max : null,
    plessi: somma(plessi),
    totale: somma(attive),
    completo: attive.length > 0 && mancanti.length === 0,
    mancanti,
  };
}

/**
 * Numero di lavoratori da usare per RLS e Primo Soccorso: il più alto tra dichiarato e in forza nel programma
 * (principio cautelativo: evita declassamenti per trasferimenti o oscillazioni). null se entrambi mancano.
 */
export function lavoratoriDiRiferimento(
  dichiarato: number | null | undefined,
  inForza: number | null | undefined,
): number | null {
  const d = typeof dichiarato === "number" && Number.isFinite(dichiarato) ? dichiarato : null;
  const f = typeof inForza === "number" && Number.isFinite(inForza) ? inForza : null;
  if (d === null && f === null) return null;
  return Math.max(d ?? 0, f ?? 0);
}

/** true se il valore ricade nella fascia [da, a] (a null = senza limite superiore). */
export function nellaFascia(valore: number | null | undefined, da: unknown, a: unknown): boolean {
  if (valore === null || valore === undefined || !Number.isFinite(valore)) return false;
  const dal = Number(da);
  if (da === null || da === undefined || !Number.isFinite(dal)) return false;
  const al = a === null || a === undefined || a === "" ? null : Number(a);
  return valore >= dal && (al === null || (Number.isFinite(al) && valore <= al));
}
