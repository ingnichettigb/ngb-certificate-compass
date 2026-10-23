/*
 * File:      RepartiTab.tsx
 * Percorso:  src/features/impostazioni/RepartiTab.tsx
 * Scheda Reparti: elenco, attivazione, eliminazione e importazione dai dipendenti.
 * Le parti sono in src/features/impostazioni/reparti/ (dati e azioni, riga, nuovo reparto, suggerimenti).
 */
import { Loader2 } from "lucide-react";
import { TabellaRepartiDialog } from "@/components/TabellaRepartiDialog";
import { ErroreTabelle } from "./ErroreTabelle";
import { NuovoReparto } from "./reparti/NuovoReparto";
import { RepartiDaImportare } from "./reparti/RepartiDaImportare";
import { RigaReparto } from "./reparti/RigaReparto";
import { useRepartiTab } from "./reparti/useRepartiTab";

export function RepartiTab() {
  const t = useRepartiTab();

  if (t.error) return <ErroreTabelle messaggio={(t.error as Error).message} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex-1 text-sm text-muted-foreground">
          Il lavoratore sceglie il proprio reparto da questo elenco. Apri un reparto per gestire i
          sottoreparti (es. ATA → AA, AT, CS, DSGA) e per decidere se chiedere classe di concorso e
          materia.
        </p>
        <TabellaRepartiDialog />
      </div>

      {t.isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Caricamento…
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {t.reparti.map((r) => (
            <RigaReparto
              key={r.id}
              reparto={r}
              figli={t.sottoreparti.filter((s) => s.reparto_id === r.id)}
              aperto={t.aperti.has(r.id)}
              occupato={t.busy === r.id}
              onApriChiudi={() => t.apriChiudi(r.id)}
              onCambiaAttivo={(v) => t.cambiaAttivo(r.id, v)}
              onCambiaClasse={(v) => t.cambiaClasse(r.id, v)}
              onRimuovi={() => t.rimuovi(r.id, r.nome)}
              onSottorepartiCambiati={t.refresh}
            />
          ))}
          {!t.reparti.length && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nessun reparto. Aggiungine uno qui sotto.
            </li>
          )}
        </ul>
      )}

      <NuovoReparto
        valore={t.nuovo}
        onCambia={t.setNuovo}
        onAggiungi={t.aggiungi}
        occupato={t.busy === "nuovo"}
      />

      <RepartiDaImportare reparti={t.daImportare} onAggiungi={t.aggiungi} />
    </div>
  );
}
