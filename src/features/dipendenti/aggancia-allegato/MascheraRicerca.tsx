/*
 * File:          MascheraRicerca.tsx
 * Percorso:      src/features/dipendenti/aggancia-allegato/MascheraRicerca.tsx
 * Data creazione: 2026-10-26
 * Revisioni:
 *   - Rev 1 (2026-10-26 15:40): Maschera di ricerca con cognome proposto e aggiunte rapide.
 *   - Rev 2 (2026-10-30 20:30): Avviso cartelle con tre stati (nessuna / da autorizzare / ok) al posto di «non selezionata».
 *   - Rev 3 (2026-11-22): Riga di avanzamento con pulsante Annulla durante la ricerca.
 */
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dipendente } from "@/lib/api";
import type { StatoCartelle } from "@/lib/api/stato-cartelle";
import { AvvisoCartelle } from "@/features/cartelle/AvvisoCartelle";
import { IndicatoreRicerca } from "@/features/cartelle/IndicatoreRicerca";
import type { AvanzamentoRicerca } from "@/lib/api/cartella-locale";

export function MascheraRicerca({
  dipendente,
  chiave,
  setChiave,
  inRicerca,
  avanzamento,
  onAnnulla,
  statoCartelle,
  onCerca,
  onScegliCartella,
  onAutorizza,
}: {
  dipendente: Dipendente;
  chiave: string;
  setChiave: (v: string | ((p: string) => string)) => void;
  inRicerca: boolean;
  avanzamento?: AvanzamentoRicerca | null | undefined;
  onAnnulla?: (() => void) | undefined;
  statoCartelle: StatoCartelle | null;
  onCerca: (t: string) => void;
  onScegliCartella: () => void;
  onAutorizza: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <AvvisoCartelle stato={statoCartelle} onAutorizza={onAutorizza} onCollega={onScegliCartella} />
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Ricerca nel nome dei file (proposto: cognome)
      </label>
      <div className="flex gap-2">
        <Input
          value={chiave}
          onChange={(e) => setChiave(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCerca(chiave)}
          placeholder="Cognome, nome, codice fiscale o parte del file..."
          className="h-10"
        />
        <Button onClick={() => onCerca(chiave)} disabled={inRicerca} className="h-10 shrink-0 gap-2">
          {inRicerca ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Cerca
        </Button>
      </div>
      {inRicerca && <IndicatoreRicerca avanzamento={avanzamento ?? null} onAnnulla={onAnnulla ?? (() => undefined)} />}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>Aggiungi:</span>
        {[dipendente.nome, dipendente.codice_fiscale].filter(Boolean).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setChiave((p) => (p ? `${p} ${t}` : t))}
            className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-foreground hover:bg-muted/80"
          >
            +{t === dipendente.codice_fiscale ? "Codice fiscale" : t}
          </button>
        ))}
      </div>
    </div>
  );
}
