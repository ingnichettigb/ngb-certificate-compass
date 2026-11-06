/*
 * File:      BarraEsportazione.tsx
 * Percorso:  src/features/stampe/components/BarraEsportazione.tsx
 * Data creaz: 03/11/2026
 * Revisioni:
 *   rev 1 — 03/11/2026 20:50 — Pulsanti CSV, Excel, Stampa/PDF in alto a destra e ripristino colonne tolte.
 *   rev 2 — 06/11/2026 — Pulsante «Univoco» (un lavoratore per riga) e suggerimento sull'ordinamento delle colonne.
 */
import { FileSpreadsheet, FileText, Printer, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  colonneTolte: number;
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

export function BarraEsportazione({ colonneTolte, onRipristina, onPdf, onExcel, onCsv, disabilitato, univoco = false, onUnivoco, univocoNonApplicabile = false }: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
      <div className="text-xs text-muted-foreground">
        {colonneTolte > 0 ? (
          <Button size="sm" type="button" variant="ghost" onClick={onRipristina}>
            <RotateCcw className="size-3.5" /> Ripristina colonne ({colonneTolte} tolte)
          </Button>
        ) : (
          <span>Clicca il titolo di una colonna per ordinarla (A→Z / Z→A), ✕ per toglierla prima di stampare o esportare.</span>
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
