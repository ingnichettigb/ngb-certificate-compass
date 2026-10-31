/*
 * File:          IntestazioneHr.tsx
 * Percorso:      src/features/hr/components/IntestazioneHr.tsx
 * Data creazione: 2026-10-20
 * Revisioni:
 *   - Rev 1 (2026-10-20 14:00): Intestazione dashboard HR con backup.
 *   - Rev 3 (2026-10-30 20:28): La matrice si apre con il solo onClose (porta i dati da sé).
 *   - Rev 4 (2026-10-31 09:00): Stato cartella locale in alto a destra.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackupBar } from "@/components/BackupBar";
import { IndicatoreCartella } from "@/features/cartelle/IndicatoreCartella";
import { MatriceAbilitazioniRuoli } from "@/features/dipendenti/matrice/MatriceAbilitazioniRuoli";

export function IntestazioneHr({ onImported }: { onImported: () => void }) {
  const [apriMatrice, setApriMatrice] = useState(false);

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-4">
          <IndicatoreCartella className="-mb-2 basis-full" />
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Torna alla home">
              <ArrowLeft className="size-5 text-muted-foreground" />
            </Link>
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-base font-semibold">Cruscotto risorse umane</h1>
              <p className="text-xs text-muted-foreground">Validazione attestati di formazione</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApriMatrice(true)}
              className="gap-1.5 border-emerald-500 font-medium text-foreground hover:bg-emerald-500/10"
            >
              <Table className="size-4 text-emerald-600" /> Matrice Abilitazioni e Ruoli
            </Button>
            <BackupBar onImported={onImported} />
          </div>
        </div>
      </header>

      {/* Finestra a tutto schermo della matrice */}
      <MatriceAbilitazioniRuoli open={apriMatrice} onClose={() => setApriMatrice(false)} />
    </>
  );
}
