/*
 * File:      LegendaMatrice.tsx
 * Percorso:  src/features/dipendenti/matrice/LegendaMatrice.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da MatriceAbilitazioniRuoli.tsx: piè di pagina con la legenda delle caselle. Nessun cambio di comportamento.
 */
export function LegendaMatrice() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-2.5 text-xs text-muted-foreground shrink-0">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded bg-emerald-600 inline-block text-white text-[9px] font-bold text-center leading-3">
            ✓
          </span>
          <span>Obbligatorio (regolare con attestato)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded bg-amber-500/30 border border-amber-600 inline-block text-amber-700 dark:text-amber-400 text-[10px] font-bold text-center leading-3">
            !
          </span>
          <span>Fabbisogno formativo da svolgere</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border border-slate-400/60 bg-slate-500/10 inline-block text-slate-600 dark:text-slate-300 text-[9px] font-bold text-center leading-3">
            E
          </span>
          <span>Esente: RSPP/ASPP valido (aggiornamento Preposto non dovuto)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border border-muted-foreground/30 inline-block" />
          <span>Non previsto per questa figura</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span>Tasti A-Z o clic sull'indice per scorrere rapidamente al cognome</span>
      </div>
    </footer>
  );
}
