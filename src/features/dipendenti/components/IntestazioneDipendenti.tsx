/*
 * File:      IntestazioneDipendenti.tsx
 * Percorso:  src/features/dipendenti/components/IntestazioneDipendenti.tsx
 * Intestazione della pagina: titolo, numero di nominativi, impostazioni, backup e matrice abilitazioni.
 * Revisioni:
 *   - Rev 2 (2026-10-28 20:35): Aggiunto pulsante Matrice Abilitazioni e Ruoli.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Table, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackupBar } from "@/components/BackupBar";
import { MatriceAbilitazioniRuoli } from "../matrice/MatriceAbilitazioniRuoli";
import { useDatiDipendenti } from "../hooks/useDatiDipendenti";

export function IntestazioneDipendenti({ totale }: { totale: number }) {
  const [apriMatrice, setApriMatrice] = useState(false);
  const { dipendenti, ruoliCatalogo, assegnazioni, attestati } = useDatiDipendenti();

  return (
    <>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApriMatrice(true)}
              className="gap-1.5 border-emerald-500 font-medium text-foreground hover:bg-emerald-500/10"
            >
              <Table className="size-4 text-emerald-600" /> Matrice Abilitazioni e Ruoli
            </Button>
            <BackupBar />
          </div>
        </div>
      </header>

      {/* Matrice a tutto schermo */}
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
