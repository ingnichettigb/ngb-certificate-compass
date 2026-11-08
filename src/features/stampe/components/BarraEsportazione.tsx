/*
 * File:      BarraEsportazione.tsx
 * Percorso:  src/features/stampe/components/BarraEsportazione.tsx
 * Data creaz: 03/11/2026
 * Revisioni:
 *   rev 1 — 03/11/2026 20:50 — Pulsanti CSV, Excel, Stampa/PDF in alto a destra e ripristino colonne tolte.
 *   rev 2 — 06/11/2026 — Pulsante «Univoco» (un lavoratore per riga) e suggerimento sull'ordinamento delle colonne.
 *   rev 3 — 07/11/2026 — «Ripristina colonne» conta anche colonne aggiunte e larghezze; suggerimento su trascinamento, doppio clic e «+».
 *   rev 4 — 08/11/2026 14:40 — Compattazione riga d'aiuto e margini verticali per ridurre l'ingombro in alto prima della tabella.
 *   rev 5 — 08/11/2026 — «Stampa» (stampante, finestra di stampa del browser) separata da «PDF» (genera e scarica un file PDF).
 */
import { FileDown, FileSpreadsheet, FileText, Printer, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  colonneTolte: number;
  /** Colonne in più scelte con il «+» e presenza di larghezze personalizzate (facoltativi). */
  colonneAggiunte?: number;
  larghezzeScelte?: boolean;
  onRipristina: () => void;
  /** Stampa classica sulla stampante. */
  onStampa: () => void;
  /** Genera e scarica un file PDF con testo modificabile. */
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

export function BarraEsportazione({
  colonneTolte,
  colonneAggiunte = 0,
  larghezzeScelte = false,
  onRipristina,
  onStampa,
  onPdf,
  onExcel,
  onCsv,
  disabilitato,
  univoco = false,
  onUnivoco,
  univocoNonApplicabile = false,
}: Props) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5 print:hidden">
      <div className="text-[11px] text-muted-foreground">
        {colonneTolte > 0 || colonneAggiunte > 0 || larghezzeScelte ? (
          <Button size="sm" type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={onRipristina}>
            <RotateCcw className="size-3" /> Ripristina colonne ({[
              colonneTolte > 0 && `${colonneTolte} tolte`,
              colonneAggiunte > 0 && `${colonneAggiunte} ${colonneAggiunte === 1 ? "aggiunta" : "aggiunte"}`,
              larghezzeScelte && "larghezze",
            ].filter(Boolean).join(", ")})
          </Button>
        ) : (
          <span>
            <b>Gestione colonne:</b> clicca per ordinare, ✕ per togliere, + per aggiungere, trascina il bordo per larghezza.
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {onUnivoco && (
          <Button
            size="sm"
            type="button"
            className="h-8 px-2.5 text-xs"
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
        <Button size="sm" type="button" variant="outline" className="h-8 px-2.5 text-xs" disabled={disabilitato} onClick={onCsv}>
          <FileText className="size-3.5" /> CSV
        </Button>
        <Button size="sm" type="button" variant="outline" className="h-8 px-2.5 text-xs" disabled={disabilitato} onClick={onExcel}>
          <FileSpreadsheet className="size-3.5" /> Excel
        </Button>
        <Button size="sm" type="button" variant="outline" className="h-8 px-2.5 text-xs" disabled={disabilitato} onClick={onPdf} title="Scarica un file PDF con testo modificabile (non passa dalla stampante)">
          <FileDown className="size-3.5" /> PDF
        </Button>
        <Button size="sm" type="button" className="h-8 px-3 text-xs" disabled={disabilitato} onClick={onStampa} title="Stampa sulla stampante">
          <Printer className="size-3.5" /> Stampa
        </Button>
      </div>
    </div>
  );
}
