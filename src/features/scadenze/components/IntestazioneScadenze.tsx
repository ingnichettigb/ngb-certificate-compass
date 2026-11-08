/*
 * File:      IntestazioneScadenze.tsx
 * Percorso:  src/features/scadenze/components/IntestazioneScadenze.tsx
 * Intestazione della pagina: titolo e numero di risultati.
 * Rev 2 (2026-11-07): tolta la freccia «Home» (c'è la barra di navigazione).
 */
import { AlertTriangle } from "lucide-react";
import { type Vista } from "../types";

export function IntestazioneScadenze({ totale, vista }: { totale: number; vista: Vista }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-5 py-4">
        <span className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">Scadenze attestati</h1>
          <p className="text-xs text-muted-foreground">
            {totale} risultati · {vista}
          </p>
        </div>
      </div>
    </header>
  );
}
