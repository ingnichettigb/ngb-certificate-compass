/*
 * File:      IntestazioneDipendenti.tsx
 * Percorso:  src/features/dipendenti/components/IntestazioneDipendenti.tsx
 * Intestazione della pagina: titolo, numero di nominativi, impostazioni e backup.
 */
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Users } from "lucide-react";
import { BackupBar } from "@/components/BackupBar";
import { ImpostazioniDialog } from "@/components/ImpostazioniDialog";

export function IntestazioneDipendenti({ totale }: { totale: number }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Torna alla home">
            <ArrowLeft className="size-5 text-muted-foreground" />
          </Link>
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Users className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Dipendenti</h1>
            <p className="text-xs text-muted-foreground">
              {totale} nominativi in archivio
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImpostazioniDialog />
          <BackupBar />
        </div>
      </div>
    </header>
  );
}
