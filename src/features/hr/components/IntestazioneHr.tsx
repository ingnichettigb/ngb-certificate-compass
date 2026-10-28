/*
 * File:          IntestazioneHr.tsx
 * Percorso:      src/features/hr/components/IntestazioneHr.tsx
 * Data creazione: 2026-10-20
 * Revisioni:
 *   - Rev 1 (2026-10-20 14:00): Intestazione dashboard HR con backup.
 *   - Rev 2 (2026-10-28 20:50): Aggiunto pulsante e apertura Matrice Abilitazioni e Ruoli.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackupBar } from "@/components/BackupBar";
import { MatriceAbilitazioniRuoli } from "@/features/dipendenti/matrice/MatriceAbilitazioniRuoli";
import { useDatiDipendenti } from "@/features/dipendenti/hooks/useDatiDipendenti";

export function IntestazioneHr({ onImported }: { onImported: () => void }) {
  const [apriMatrice, setApriMatrice] = useState(false);
  const { dipendenti, ruoliCatalogo, assegnazioni, attestati } = useDatiDipendenti();

  return (
    <>
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
      <MatriceAbilitazioniRuoli
        open={apriMatrice}
        onChiudi={() => setApriMatrice(false)}
        dipendenti={dipendenti}
        ruoliCatalogo={ruoliCatalogo}
        assegnazioni={assegnazioni}
        attestati={attestati}
      />
    </>
  );
}
