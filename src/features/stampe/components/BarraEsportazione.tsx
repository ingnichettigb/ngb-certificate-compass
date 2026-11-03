/*
 * File:      BarraEsportazione.tsx
 * Percorso:  src/features/stampe/components/BarraEsportazione.tsx
 * Data creaz: 03/11/2026
 * Revisioni:
 *   rev 1 — 03/11/2026 20:50 — Pulsanti CSV, Excel, Stampa/PDF in alto a destra e ripristino colonne tolte.
 */
import { FileSpreadsheet, FileText, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  colonneTolte: number;
  onRipristina: () => void;
  onPdf: () => void;
  onExcel: () => void;
  onCsv: () => void;
  disabilitato: boolean;
};

export function BarraEsportazione({ colonneTolte, onRipristina, onPdf, onExcel, onCsv, disabilitato }: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
      <div className="text-xs text-muted-foreground">
        {colonneTolte > 0 ? (
          <Button size="sm" type="button" variant="ghost" onClick={onRipristina}>
            <RotateCcw className="size-3.5" /> Ripristina colonne ({colonneTolte} tolte)
          </Button>
        ) : (
          <span>Clicca ✕ su un'intestazione per togliere la colonna prima di stampare o esportare.</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
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
