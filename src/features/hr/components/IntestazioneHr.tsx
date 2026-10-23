/*
 * File:      IntestazioneHr.tsx
 * Percorso:  src/features/hr/components/IntestazioneHr.tsx
 * Intestazione della dashboard HR: titolo, impostazioni e backup.
 */
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BackupBar } from "@/components/BackupBar";
import { ImpostazioniDialog } from "@/components/ImpostazioniDialog";

export function IntestazioneHr({ onImported }: { onImported: () => void }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Torna alla home">
            <ArrowLeft className="size-5 text-muted-foreground" />
          </Link>
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-base font-semibold">Dashboard HR</h1>
            <p className="text-xs text-muted-foreground">Validazione attestati di formazione</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImpostazioniDialog />
          <BackupBar onImported={onImported} />
        </div>
      </div>
    </header>
  );
}
