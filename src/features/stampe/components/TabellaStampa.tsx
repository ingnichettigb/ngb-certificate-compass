/*
 * File:      TabellaStampa.tsx
 * Percorso:  src/features/stampe/components/TabellaStampa.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Tabella righe attestati per i modelli di stampa.
 *   rev 2 — 03/11/2026 20:50 — Pulsante ✕ su ogni intestazione per togliere la colonna (non stampato).
 *   rev 3 — 04/11/2026 10:20 — Intestazione fissa sticky con sfondo opaco per scorrimento record.
 *   rev 4 — 05/11/2026 19:50 — Celle con dato anagrafico mancante in rosso grassetto (anche in stampa).
 *   rev 5 — 06/11/2026 — Clic sull'intestazione per ordinare A→Z / Z→A / nessuno (frecce non stampate).
 */
import { ArrowDown, ArrowUp, ArrowUpDown, X } from "lucide-react";
import {
  cella, cellaMancante, INTESTAZIONI, ordinaRighe,
  type Colonna, type OrdineColonna, type RigaStampa,
} from "../dati-stampa";

type Props = {
  righe: RigaStampa[];
  colonne: Colonna[];
  onRimuoviColonna?: ((c: Colonna) => void) | undefined;
  /** Ordinamento attivo (se c'è) e gestore del clic sull'intestazione. */
  ordine?: OrdineColonna | null | undefined;
  onOrdina?: ((c: Colonna) => void) | undefined;
};

export function TabellaStampa({ righe: righeIn, colonne, onRimuoviColonna, ordine = null, onOrdina }: Props) {
  const righe = ordinaRighe(righeIn, ordine);
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead className="table-header-group sticky top-0 z-10 bg-background print:static">
        <tr>
          <th className="sticky top-0 z-10 w-8 border border-foreground/60 bg-muted px-1.5 py-1 text-center font-semibold print:static">
            N°
          </th>
          {colonne.map((c) => (
            <th
              key={c}
              aria-sort={ordine?.colonna === c ? (ordine.direzione === "asc" ? "ascending" : "descending") : undefined}
              className="sticky top-0 z-10 border border-foreground/60 bg-muted px-1.5 py-1 text-left font-semibold print:static"
            >
              <div className="flex items-center justify-between gap-1">
                {onOrdina ? (
                  <button
                    type="button"
                    onClick={() => onOrdina(c)}
                    title={
                      ordine?.colonna === c
                        ? ordine.direzione === "asc"
                          ? `Ordinata dalla A alla Z: clic per Z→A`
                          : `Ordinata dalla Z alla A: clic per togliere l'ordine`
                        : `Ordina «${INTESTAZIONI[c]}» dalla A alla Z`
                    }
                    className="flex items-center gap-1 text-left font-semibold hover:text-primary print:pointer-events-none"
                  >
                    <span>{INTESTAZIONI[c]}</span>
                    <span className="print:hidden">
                      {ordine?.colonna === c ? (
                        ordine.direzione === "asc" ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </span>
                  </button>
                ) : (
                  <span>{INTESTAZIONI[c]}</span>
                )}
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
                className={`border border-foreground/40 px-1.5 py-0.5 ${c === "stato" && r.stato === "scaduto" ? "font-bold text-destructive" : ""} ${c === "stato" && r.stato === "in_scadenza" ? "font-semibold" : ""} ${c === "mancano" || cellaMancante(r, c) ? "font-bold text-destructive" : ""}`}
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
