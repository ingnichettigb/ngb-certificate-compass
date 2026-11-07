/*
 * File:      BarraEsportazione.tsx
 * Percorso:  src/features/stampe/components/BarraEsportazione.tsx
 * Data creaz: 03/11/2026
 * Revisioni:
 *   rev 1 — 03/11/2026 20:50 — Pulsanti CSV, Excel, Stampa/PDF in alto a destra e ripristino colonne tolte.
 *   rev 2 — 06/11/2026 — Pulsante «Univoco» (un lavoratore per riga) e suggerimento sull'ordinamento delle colonne.
 *   rev 3 — 07/11/2026 — «Ripristina colonne» conta anche colonne aggiunte e larghezze; suggerimento su trascinamento, doppio clic e «+».
 */
import { FileSpreadsheet, FileText, Printer, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  colonneTolte: number;
  /** Colonne in più scelte con il «+» e presenza di larghezze personalizzate (facoltativi). */
  colonneAggiunte?: number;
  larghezzeScelte?: boolean;
  onRipristina: () => void;
  onPdf: () => void;
  onExcel: () => void;
  onCsv: () => void;
  disabilitato: boolean;
  /** «Univoco»: un solo record per lavoratore (scadenza più urgente). */
  univoco?: boolean;
  onUnivoco?: () => void;
  /** Non applicabile (elenco lavoratori e schede individuali hanno già un lavoratore per riga/sezione). */
  univocoNonApplicabile?: boolean;
};

export function BarraEsportazione({ colonneTolte, colonneAggiunte = 0, larghezzeScelte = false, onRipristina, onPdf, onExcel, onCsv, disabilitato, univoco = false, onUnivoco, univocoNonApplicabile = false }: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
      <div className="text-xs text-muted-foreground">
        {colonneTolte > 0 || colonneAggiunte > 0 || larghezzeScelte ? (
          <Button size="sm" type="button" variant="ghost" onClick={onRipristina}>
            <RotateCcw className="size-3.5" /> Ripristina colonne ({[
              colonneTolte > 0 && `${colonneTolte} tolte`,
              colonneAggiunte > 0 && `${colonneAggiunte} ${colonneAggiunte === 1 ? "aggiunta" : "aggiunte"}`,
              larghezzeScelte && "larghezze",
            ].filter(Boolean).join(", ")})
          </Button>
        ) : (
          <span>
            Clicca il titolo di una colonna per ordinarla (A→Z / Z→A), ✕ per toglierla, + per aggiungerne;
            trascina il bordo per restringerla, doppio clic per adattarla al contenuto.
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {onUnivoco && (
          <Button
            size="sm"
            type="button"
            variant={univoco ? "default" : "outline"}
            aria-pressed={univoco}
            disabled={univocoNonApplicabile}
            onClick={onUnivoco}
            title={
              univocoNonApplicabile
                ? "Questo documento ha già un solo lavoratore per riga"
                : "Mostra ogni lavoratore una sola volta, con la scadenza più urgente"
            }
          >
            <Users className="size-3.5" /> Univoco
          </Button>
        )}
        <Button size="sm" type="button" variant="outline" disabled={disabilitato} onClick={onCsv}>
          <FileText className="size-3.5" /> CSV
        </Button>
        <Button size="sm" type="button" variant="outline" disabled={disabilitato} onClick={onExcel}>
          <FileSpreadsheet className="size-3.5" /> Excel
        </Button>
        <Button size="sm" type="button" disabled={disabilitato} onClick={onPdf}>
          <Printer className="size-3.5" /> Stampa / PDF
        </Button>
      </div>
    </div>
  );
}
