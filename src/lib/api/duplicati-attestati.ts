/*
 * File:           duplicati-attestati.ts
 * Percorso:       src/lib/api/duplicati-attestati.ts
 * Data creazione: 2026-10-30
 * Revisioni:
 *   - Rev 1 (2026-10-30 10:30): Numero univoco attestato (AAMMGG-CODICE) e rilevamento
 *     doppioni (stesso lavoratore + stesso corso + stessa data). I corsi sdoppiati
 *     (corsi diversi nella stessa data) NON sono doppioni.
 */

type BaseDup = {
  id: string;
  dipendente_id: string;
  tipo_corso_id: string;
  data_corso: string | null;
  stato_validazione?: string | null;
};

/** Numero automatico: AAMMGG-CODICECORSO (es. 240930-SIC-GEN-04). */
export function generaNumeroAttestato(dataCorso: string | null | undefined, codiceCorso: string | null | undefined): string {
  const d = (dataCorso || "").slice(0, 10);
  const aammgg = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10) : "000000";
  const codice = (codiceCorso || "").trim().toUpperCase() || "CORSO";
  return `${aammgg}-${codice}`;
}

export function chiaveDuplicato(a: Pick<BaseDup, "dipendente_id" | "tipo_corso_id" | "data_corso">): string {
  return `${a.dipendente_id}|${a.tipo_corso_id}|${(a.data_corso || "").slice(0, 10)}`;
}

/** Restituisce id attestato → numero di registrazioni identiche (solo se > 1). I respinti sono esclusi. */
export function trovaDuplicati(attestati: BaseDup[]): Map<string, number> {
  const gruppi = new Map<string, string[]>();
  for (const a of attestati) {
    if (a.stato_validazione === "Respinto") continue;
    const k = chiaveDuplicato(a);
    gruppi.set(k, [...(gruppi.get(k) ?? []), a.id]);
  }
  const out = new Map<string, number>();
  for (const ids of gruppi.values()) if (ids.length > 1) for (const id of ids) out.set(id, ids.length);
  return out;
}
