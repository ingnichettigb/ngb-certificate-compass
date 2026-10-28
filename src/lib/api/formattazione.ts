/*
 * File:      formattazione.ts
 * Percorso:  src/lib/api/formattazione.ts
 * Formattazione date e classi dei badge di stato.
 * Revisioni:
 *   - Rev 2 (2026-10-28 11:50): Badge ambra per «In attesa di integrazione».
 */

export function statoBadgeClass(stato: string) {
  if (stato === "Approvato") return "bg-success/12 text-success border-success/30";
  if (stato === "Respinto") return "bg-destructive/12 text-destructive border-destructive/30";
  if (stato === "In attesa di integrazione")
    return "bg-amber-500/15 text-amber-800 border-amber-500/40 dark:text-amber-300";
  return "bg-warning/15 text-warning-foreground border-warning/35";
}

export function formatData(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function scaduto(d: string | null | undefined) {
  if (!d) return false;
  return new Date(d) < new Date();
}
