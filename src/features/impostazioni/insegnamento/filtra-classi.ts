/*
 * File:      filtra-classi.ts
 * Percorso:  src/features/impostazioni/insegnamento/filtra-classi.ts
 * Ricerca nell'elenco delle classi di concorso (per codice o denominazione, maiuscole ignorate).
 */
export function filtraClassi<T extends { codice: string; denominazione?: string | null }>(
  classi: T[],
  filtro: string,
): T[] {
  const t = filtro.trim().toLowerCase();
  if (!t) return classi;
  return classi.filter(
    (c) => c.codice.toLowerCase().includes(t) || (c.denominazione ?? "").toLowerCase().includes(t),
  );
}
