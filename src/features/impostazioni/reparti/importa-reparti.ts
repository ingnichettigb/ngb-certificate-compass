/*
 * File:      importa-reparti.ts
 * Percorso:  src/features/impostazioni/reparti/importa-reparti.ts
 * Trova i valori di "reparto" già scritti a mano nei dipendenti ma non ancora presenti in elenco.
 */

/**
 * Restituisce al massimo 30 reparti, senza doppioni (maiuscole ignorate), in ordine alfabetico.
 * Salta i valori vuoti, quelli oltre 40 caratteri e quelli che iniziano con una cifra (date importate male).
 */
export function repartiDaImportare(
  dipendenti: { reparto?: string | null }[],
  reparti: { nome: string }[],
): string[] {
  const presenti = new Set(reparti.map((r) => r.nome.trim().toLowerCase()));
  const visti = new Map<string, string>();
  for (const d of dipendenti) {
    const v = (d.reparto ?? "").trim();
    if (!v || v.length > 40 || /^\d/.test(v)) continue;
    const k = v.toLowerCase();
    if (!presenti.has(k) && !visti.has(k)) visti.set(k, v);
  }
  return Array.from(visti.values())
    .sort((a, b) => a.localeCompare(b, "it"))
    .slice(0, 30);
}
