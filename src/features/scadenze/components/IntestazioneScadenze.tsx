/*
 * File:      IntestazioneScadenze.tsx
 * Percorso:  src/features/scadenze/components/IntestazioneScadenze.tsx
 * Revisione: 3 — 28/11/2026 09:11
 * Intestazione della pagina: titolo, numero di risultati e filtri scelti (si vedono anche nella stampa).
 * Rev 2 (2026-11-07): tolta la freccia «Home» (c'è la barra di navigazione).
 * Rev 3 (28/11/2026 09:11): Mostra anche reparto, ruolo e corso scelti (parametro facoltativo «dettaglio»).
 */
import { AlertTriangle } from "lucide-react";
import { type Vista } from "../types";

export function IntestazioneScadenze({ totale, vista, dettaglio }: { totale: number; vista: Vista; dettaglio?: string }) {
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
            {dettaglio ? ` · ${dettaglio}` : ""}
          </p>
        </div>
      </div>
    </header>
  );
}
