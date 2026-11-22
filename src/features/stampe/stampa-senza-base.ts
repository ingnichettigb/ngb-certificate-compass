/*
 * File:      stampa-senza-base.ts
 * Percorso:  src/features/stampe/stampa-senza-base.ts
 * Data creaz: 22/11/2026
 * Revisioni:
 *   rev 1 — 22/11/2026 — Aggiornamento senza corso base (defibrillatore, antincendio, primo soccorso, preposti): il lavoratore non risulta
 *            «Scaduto» (l'aggiornamento è stato fatto) e riceve, sopra l'aggiornamento, una riga «Manca corso base».
 *
 * Regola per riconoscere l'aggiornamento: il codice del corso contiene «AGG» oppure il livello è «Aggiornamento»
 * (VFF-FOR1A2 e PSO-AgB-04 non contengono «AGG» ma hanno livello «Aggiornamento»; PRP-BAS-12 ha livello «Specifico»).
 * Tutto il resto dello stesso gruppo è considerato corso base. Funzioni pure: non toccano il motore dei cicli.
 */
import type { Attestato } from "@/lib/api";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";

/** Gruppi con corso base + aggiornamento (la Privacy è esclusa: i suoi corsi hanno tutti livello Base). */
export const GRUPPI_CON_BASE_E_AGGIORNAMENTO: ReadonlySet<string> = new Set(["defibrillatore", "antincendio", "primo-soccorso", "preposti"]);

export const TESTO_MANCA_BASE = "Manca corso base";
export const TESTO_AGGIORNAMENTO_SVOLTO = "Aggiornamento svolto";

type TipoCorsoMinimo = { codice?: string | null; livello_specifico?: string | null } | null | undefined;

/** Aggiornamento = «AGG» nel codice oppure livello «Aggiornamento». */
export function eAggiornamento(tc: TipoCorsoMinimo): boolean {
  const codice = (tc?.codice ?? "").toUpperCase();
  const livello = (tc?.livello_specifico ?? "").toLowerCase().trim();
  return codice.includes("AGG") || livello === "aggiornamento";
}

/** Chiave del gruppo se è uno di quelli con base + aggiornamento, altrimenti null. */
export function gruppoConBase(a: Pick<Attestato, "tipi_corso">): string | null {
  if (!a.tipi_corso) return null;
  const chiave = assegnaGruppoArgomento(a.tipi_corso).chiave;
  return GRUPPI_CON_BASE_E_AGGIORNAMENTO.has(chiave) ? chiave : null;
}

/** Chiavi «dipendente|gruppo» di chi ha almeno un aggiornamento e nessun corso base (attestati già filtrati per stato). */
export function aggiornamentiSenzaBase(attestati: Attestato[]): Set<string> {
  const conta = new Map<string, { agg: number; base: number }>();
  for (const a of attestati) {
    const g = gruppoConBase(a);
    if (!g) continue;
    const k = `${a.dipendente_id}|${g}`;
    const c = conta.get(k) ?? { agg: 0, base: 0 };
    if (eAggiornamento(a.tipi_corso)) c.agg += 1;
    else c.base += 1;
    conta.set(k, c);
  }
  const out = new Set<string>();
  for (const [k, c] of conta) if (c.agg > 0 && c.base === 0) out.add(k);
  return out;
}
