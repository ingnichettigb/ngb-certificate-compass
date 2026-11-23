/*
 * File:          IndicatoreRicerca.tsx
 * Percorso:      src/features/cartelle/IndicatoreRicerca.tsx
 * Data creazione: 2026-11-22
 * Revisioni:
 *   - Rev 1 (2026-11-22): Riga «Ricerca in corso» con cartelle e file esaminati, file trovati e pulsante Annulla.
 *     Se i contatori restano a zero il blocco è prima della lettura (cartelle collegate, permessi, archivio del browser).
 */
import { Button } from "@/components/ui/button";
import type { AvanzamentoRicerca } from "@/lib/api/cartella-locale";

const n = (v: number) => v.toLocaleString("it-IT");

export function IndicatoreRicerca({ avanzamento, onAnnulla }: { avanzamento: AvanzamentoRicerca | null; onAnnulla: () => void }) {
  if (!avanzamento) return null;
  const inPreparazione = avanzamento.cartelle === 0 && avanzamento.file === 0;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
    >
      <span>
        {inPreparazione
          ? "Preparazione della ricerca: lettura delle cartelle collegate e dei permessi…"
          : `Ricerca in corso… ${n(avanzamento.cartelle)} cartelle e ${n(avanzamento.file)} file esaminati · ${n(avanzamento.trovati)} trovati`}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={onAnnulla}>
        Annulla
      </Button>
    </div>
  );
}
