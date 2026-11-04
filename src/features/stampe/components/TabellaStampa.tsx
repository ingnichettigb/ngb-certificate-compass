/*
 * File:      TabellaStampa.tsx
 * Percorso:  src/features/stampe/components/TabellaStampa.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Tabella righe attestati per i modelli di stampa.
 *   rev 2 — 03/11/2026 20:50 — Pulsante ✕ su ogni intestazione per togliere la colonna (non stampato).
 * - Rev (2026-11-04 08:40): Colonna N° progressiva, intestazione fissa e scorrimento orizzontale.
 */
import { X } from "lucide-react";
import { cella, INTESTAZIONI, type Colonna, type RigaStampa } from "../dati-stampa";

type Props = {
  righe: RigaStampa[];
  colonne: Colonna[];
  onRimuoviColonna?: ((c: Colonna) => void) | undefined;
};

export function TabellaStampa({ righe, colonne, onRimuoviColonna }: Props) {
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead className="table-header-group">
        <tr>
          <th className="w-8 border border-foreground/60 bg-muted px-1.5 py-1 text-center font-semibold">N°</th>
          {colonne.map((c) => (
            <th key={c} className="border border-foreground/60 bg-muted px-1.5 py-1 text-left font-semibold">
              <div className="flex items-center justify-between gap-1">
                <span>{INTESTAZIONI[c]}</span>
                {onRimuoviColonna && colonne.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRimuoviColonna(c)}
                    title={`Togli la colonna «${INTESTAZIONI[c]}»`}
                    aria-label={`Togli colonna ${INTESTAZIONI[c]}`}
                    className="rounded p-0.5 opacity-60 hover:bg-destructive/20 hover:text-destructive hover:opacity-100 print:hidden"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {righe.map((r, i) => (
          <tr key={r.id} className="odd:bg-muted/30" style={{ breakInside: "avoid" }}>
            <td className="border border-foreground/40 px-1.5 py-0.5 text-center font-mono">{i + 1}</td>
            {colonne.map((c) => (
              <td
                key={c}
                className={`border border-foreground/40 px-1.5 py-0.5 ${c === "stato" && r.stato === "scaduto" ? "font-bold text-destructive" : ""} ${c === "stato" && r.stato === "in_scadenza" ? "font-semibold" : ""}`}
              >
                {cella(r, c)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
