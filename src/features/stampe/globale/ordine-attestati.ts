/*
 * File:      ordine-attestati.ts
 * Percorso:  src/features/stampe/globale/ordine-attestati.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — Attestati di un lavoratore raggruppati per funzione (stesso ordine di INCARICHI: sicurezza lavoratori, preposto,
 *            primo soccorso, antincendio, defibrillatore, evacuazione, poi le altre macro-categorie in ordine alfabetico) e, dentro la
 *            funzione, per data di emissione (data del corso) dal più recente al più vecchio.
 */
import type { Attestato } from "@/lib/api";
import { INCARICHI } from "@/lib/api/incarichi";

export type GruppoAttestati = { chiave: string; etichetta: string; attestati: Attestato[] };

const ALTRO = "Altro";

function funzioneDi(a: Attestato): { indice: number; etichetta: string } {
  const macro = (a.tipi_corso?.macro_categoria ?? "").trim();
  const i = INCARICHI.findIndex((x) => x.categoria.toLowerCase() === macro.toLowerCase());
  const inc = INCARICHI[i];
  if (inc) return { indice: i, etichetta: inc.label };
  return { indice: INCARICHI.length, etichetta: macro || ALTRO };
}

/** Data più recente prima; senza data in fondo. */
function perDataRecentePrima(a: Attestato, b: Attestato): number {
  const da = (a.data_corso ?? "").slice(0, 10);
  const db = (b.data_corso ?? "").slice(0, 10);
  if (da === db) return a.id.localeCompare(b.id);
  if (!da) return 1;
  if (!db) return -1;
  return da < db ? 1 : -1;
}

export function raggruppaPerFunzione(attestati: readonly Attestato[]): GruppoAttestati[] {
  const gruppi = new Map<string, { indice: number; etichetta: string; attestati: Attestato[] }>();
  for (const a of attestati) {
    const f = funzioneDi(a);
    const chiave = `${String(f.indice).padStart(3, "0")}|${f.etichetta.toLowerCase()}`;
    const g = gruppi.get(chiave) ?? { indice: f.indice, etichetta: f.etichetta, attestati: [] };
    g.attestati.push(a);
    gruppi.set(chiave, g);
  }
  return [...gruppi.entries()]
    .sort(([ka, a], [kb, b]) => a.indice - b.indice || ka.localeCompare(kb, "it"))
    .map(([chiave, g]) => ({
      chiave,
      etichetta: g.etichetta,
      attestati: g.attestati.sort(perDataRecentePrima),
    }));
}

/** Tutti gli attestati nell'ordine di stampa (funzione, poi data), in un solo elenco. */
export function attestatiInOrdine(attestati: readonly Attestato[]): Attestato[] {
  return raggruppaPerFunzione(attestati).flatMap((g) => g.attestati);
}
