/*
 * File:          ElencoFileTrovati.tsx
 * Percorso:      src/features/dipendenti/aggancia-allegato/ElencoFileTrovati.tsx
 * Data creazione: 2026-10-26
 * Revisioni:
 *   - Rev 1 (2026-10-26 15:40): Elenco file trovati con spunta singola (come "Aggancia").
 */
import { FileText } from "lucide-react";
import type { FileTrovato } from "@/lib/api/cartella-locale";

export function ElencoFileTrovati({
  risultati,
  chiave,
  selezionato,
  onScegli,
}: {
  risultati: FileTrovato[] | null;
  chiave: string;
  selezionato: FileTrovato | null;
  onScegli: (f: FileTrovato) => void;
}) {
  if (risultati === null) return null;
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        File trovati ({risultati.length})
      </div>
      {risultati.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nessun file trovato per <strong>"{chiave}"</strong>.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {risultati.map((f) => {
            const on = selezionato?.percorsoRelativo === f.percorsoRelativo;
            return (
              <div
                key={f.percorsoRelativo}
                onClick={() => onScegli(f)}
                className={`flex cursor-pointer items-center gap-3 p-3 ${
                  on ? "border-l-4 border-success bg-success/10" : "hover:bg-muted/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onScegli(f)}
                  onClick={(e) => e.stopPropagation()}
                  className="size-5 cursor-pointer accent-success"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 shrink-0 text-primary" />
                    <span className="truncate text-sm font-semibold">{f.nome}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{f.percorsoRelativo}</span> •{" "}
                    {f.dataModifica.toLocaleDateString("it-IT")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
