/*
 * File:      IntestazioneDipendenti.tsx
 * Percorso:  src/features/dipendenti/components/IntestazioneDipendenti.tsx
 * Intestazione della pagina: titolo, numero di nominativi, impostazioni, backup e matrice abilitazioni.
 * Revisioni:
 *   - Rev 3 (2026-10-30 20:28): La matrice si apre con il solo onClose (porta i dati da sé).
 *   - Rev 4 (2026-10-31 09:00): Stato cartella locale in alto a destra.
 *   - Rev 5 (2026-11-03 14:30): Bottone «Importa elenco Word/Excel».
 *   - Rev 6 (2026-11-06 08:20): Prop onCompletaUnoAUno: dall'esito dell'importazione si apre la finestra «Da completare».
 *   - Rev 7 (2026-11-07): Backup, impostazioni, stato cartella e avviso ditta sono nel menu «Sistema» della barra; tolta la freccia «Home».
 */
import { useState } from "react";
import { FileUp, Table, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatriceAbilitazioniRuoli } from "../matrice/MatriceAbilitazioniRuoli";
import { DialogImportaElenco } from "../import-elenco/DialogImportaElenco";

export function IntestazioneDipendenti({
  totale,
  onCompletaUnoAUno,
}: {
  totale: number;
  onCompletaUnoAUno?: () => void;
}) {
  const [apriMatrice, setApriMatrice] = useState(false);
  const [apriImport, setApriImport] = useState(false);

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
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
            <Button variant="outline" size="sm" onClick={() => setApriImport(true)} className="gap-1.5">
              <FileUp className="size-4" /> Importa elenco Word/Excel
            </Button>
          </div>
        </div>
      </header>

      {/* Matrice a tutto schermo */}
      <MatriceAbilitazioniRuoli open={apriMatrice} onClose={() => setApriMatrice(false)} />
      <DialogImportaElenco open={apriImport} onClose={() => setApriImport(false)} onCompleta={onCompletaUnoAUno} />
    </>
  );
}
