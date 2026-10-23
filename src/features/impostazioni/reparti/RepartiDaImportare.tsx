/*
 * File:      RepartiDaImportare.tsx
 * Percorso:  src/features/impostazioni/reparti/RepartiDaImportare.tsx
 * Suggerimenti: reparti già scritti nei dipendenti ma non ancora in elenco, da aggiungere con un tocco.
 */
interface Props {
  reparti: string[];
  onAggiungi: (nome: string) => void;
}

export function RepartiDaImportare({ reparti, onAggiungi }: Props) {
  if (reparti.length === 0) return null;
  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">
        Già presenti nei dipendenti ma non nell'elenco. Tocca per aggiungerli:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {reparti.map((v) => (
          <button
            key={v}
            onClick={() => onAggiungi(v)}
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs hover:bg-accent/40"
          >
            + {v}
          </button>
        ))}
      </div>
    </div>
  );
}
