/*
 * File:      PannelliDocumento.tsx
 * Percorso:  src/components/image-viewer/PannelliDocumento.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da ImageViewer.tsx: pannelli «file non trovato» e «nessun documento allegato». Nessun cambio di comportamento.
 */
import { FileQuestion, FileText, FolderOpen, FolderSearch, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StatoCartelle } from "@/lib/api/stato-cartelle";

interface PropsNonTrovato {
  percorsoGrezzo: string;
  nomeFile: string | undefined;
  statoCartelle: StatoCartelle | null;
  inConnessione: boolean;
  onAutorizza: () => void;
  onCollega: () => void;
  onRicontrolla: () => void;
}

/** Caso 1: c'era un percorso memorizzato ma il file non è stato aperto: si dice esattamente perché. */
export function PannelloFileNonTrovato({
  percorsoGrezzo,
  nomeFile,
  statoCartelle,
  inConnessione,
  onAutorizza,
  onCollega,
  onRicontrolla,
}: PropsNonTrovato) {
  const stato = statoCartelle?.stato ?? "ok";
  const nomiSenza = (statoCartelle?.cartelle ?? [])
    .filter((c) => !c.autorizzata)
    .map((c) => c.nome);
  const nomiTutte = (statoCartelle?.cartelle ?? []).map((c) => c.nome);
  const titolo =
    stato === "nessuna"
      ? "Nessuna cartella collegata"
      : stato === "da_autorizzare"
        ? "Permesso alla cartella non concesso"
        : "File non trovato nelle cartelle collegate";
  const spiegazione =
    stato === "nessuna"
      ? "Per aprire i PDF presenti sul tuo computer, collega la cartella in cui conservi gli attestati."
      : stato === "da_autorizzare"
        ? `Il browser deve autorizzare la lettura di: ${nomiSenza.join(", ")}. Il file potrebbe trovarsi lì.`
        : `Cercato in: ${nomiTutte.join(", ")}. Il file potrebbe essere stato spostato o rinominato, oppure appartenere a un altro computer: usa l'icona di sostituzione per riagganciarlo.`;
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface p-6 text-center shadow-sm"
    >
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        <FileText className="size-7" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">{titolo}</p>
        <p
          className="line-clamp-2 font-mono text-xs text-muted-foreground"
          title={percorsoGrezzo || nomeFile}
        >
          {nomeFile || percorsoGrezzo}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">{spiegazione}</p>

      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {stato === "da_autorizzare" && (
          <Button
            type="button"
            size="sm"
            onClick={onAutorizza}
            disabled={inConnessione}
            className="gap-1.5"
          >
            <FolderOpen className="size-4" />
            Autorizza cartella archivio
          </Button>
        )}
        {stato === "nessuna" && (
          <Button
            type="button"
            size="sm"
            onClick={onCollega}
            disabled={inConnessione}
            className="gap-1.5"
          >
            <FolderSearch className="size-4" />
            Collega cartella dal computer
          </Button>
        )}
        {stato === "ok" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRicontrolla}
            disabled={inConnessione}
            className="gap-1.5"
          >
            <RotateCw className="size-4" />
            Ricontrolla
          </Button>
        )}
      </div>
    </div>
  );
}

/** Caso 2: nessun documento registrato o link rimosso. */
export function PannelloNessunDocumento() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface p-8 text-center text-muted-foreground shadow-sm">
      <FileQuestion className="size-8 opacity-60" />
      <div className="space-y-1">
        <p className="font-semibold text-foreground">Nessun documento PDF allegato</p>
        <p className="text-xs text-muted-foreground">
          I dati del corso sono salvati nell'anagrafica. Puoi approvare l'attestato senza allegato
          per archiviarlo.
        </p>
      </div>
    </div>
  );
}
