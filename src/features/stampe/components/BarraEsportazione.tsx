/*
 * File:      BarraEsportazione.tsx
 * Percorso:  src/features/stampe/components/BarraEsportazione.tsx
 * Data creaz: 03/11/2026
 * Revisioni:
 *   rev 1 — 03/11/2026 20:35 — Barra pulsanti PDF, Excel, CSV in alto a destra e ripristino colonne.
 */
import { FileSpreadsheet, FileText, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  haColonneRimosse: boolean;
  onRipristinaColonne: () => void;
  onStampaPdf: () => void;
  onEsportaExcel: () => void;
  onEsportaCsv: () => void;
  disabilitato: boolean;
};

export function BarraEsportazione({
  haColonneRimosse,
  onRipristinaColonne,
  onStampaPdf,
  onEsportaExcel,
  onEsportaCsv,
  disabilitato,
}: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
      <div>
        {haColonneRimosse && (
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={onRipristinaColonne}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1 size-3" /> Ripristina colonne iniziali
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          type="button"
          variant="outline"
          disabled={disabilitato}
          onClick={onEsportaCsv}
          title="Esporta le colonne visibili in file CSV"
        >
          <FileText className="mr-1 size-3.5" /> CSV
        </Button>

        <Button
          size="sm"
          type="button"
          variant="outline"
          disabled={disabilitato}
          onClick={onEsportaExcel}
          title="Esporta le colonne visibili in file Excel a foglio unico"
        >
          <FileSpreadsheet className="mr-1 size-3.5 text-emerald-600" /> Excel (XLS)
        </Button>

        <Button
          size="sm"
          type="button"
          disabled={disabilitato}
          onClick={onStampaPdf}
          title="Stampa o salva in PDF il documento formattato"
        >
          <Printer className="mr-1 size-3.5" /> Stampa / PDF
        </Button>
      </div>
    </div>
  );
}
