/*
 * File:          AvvisoDatiDitta.tsx
 * Percorso:      src/features/ditta/AvvisoDatiDitta.tsx
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 12:00): Avviso in testata quando i dati dichiarati della ditta (lavoratori, presenze della scuola)
 *     mancano o non sono più allineati alla realtà.
 */
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { calcolaAvvisi, type Soglia } from "./regole-ditta";
import { useDitta, useLavoratoriInForza, useSoglieDitta } from "./useDitta";

export function AvvisoDatiDitta({ className }: { className?: string }) {
  const { data: ditta } = useDitta();
  const { data: soglie } = useSoglieDitta();
  const { data: inForza } = useLavoratoriInForza();

  if (!ditta || !soglie) return null;
  const avvisi = calcolaAvvisi(ditta, soglie as Soglia[], inForza ?? null);
  if (avvisi.length === 0) return null;

  return (
    <div className={cn("flex min-w-0 flex-col items-end gap-0.5", className)}>
      {avvisi.map((a) => (
        <span
          key={a.chiave}
          role="status"
          title={a.dettaglio}
          className="inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400"
        >
          <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{a.testo}</span>
        </span>
      ))}
    </div>
  );
}
