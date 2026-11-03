/*
 * File:      TabellaStampa.tsx
 * Percorso:  src/features/stampe/components/TabellaStampa.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Tabella righe attestati per i modelli di stampa.
 *   rev 2 — 03/11/2026 20:35 — Intestazioni con rimozione rapida colonna (✕) prima della stampa/esportazione.
 */
import { X } from "lucide-react";
import { dataIt, ETICHETTA_STATO, type RigaStampa } from "../dati-stampa";

export type Colonna =
  | "lavoratore"
  | "cf"
  | "reparto"
  | "sottoreparto"
  | "materia"
  | "corso"
  | "ore"
  | "numero"
  | "data"
  | "scadenza"
  | "stato";

export const INTESTAZIONI: Record<Colonna, string> = {
  lavoratore: "Lavoratore",
  cf: "Codice fiscale",
  reparto: "Reparto",
  sottoreparto: "Profilo ATA",
  materia: "Materia",
  corso: "Corso",
  ore: "Ore",
  numero: "N. attestato",
  data: "Data corso",
  scadenza: "Scadenza",
  stato: "Stato",
};

export function cella(r: RigaStampa, c: Colonna): string {
  switch (c) {
    case "lavoratore": return `${r.cognome} ${r.nome}`;
    case "cf": return r.cf;
    case "reparto": return r.reparto;
    case "sottoreparto": return r.sottoreparto || "—";
    case "materia": return r.materia || "—";
    case "corso": return r.codice ? `${r.codice} – ${r.corso}` : r.corso;
    case "ore": return r.ore != null ? String(r.ore) : "—";
    case "numero": return r.numero || "—";
    case "data": return dataIt(r.dataCorso);
    case "scadenza": return dataIt(r.scadenza);
    case "stato": return ETICHETTA_STATO[r.stato];
  }
}

type Props = {
  righe: RigaStampa[];
  colonne: Colonna[];
  onRimuoviColonna?: (c: Colonna) => void;
};

export function TabellaStampa({ righe, colonne, onRimuoviColonna }: Props) {
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead className="table-header-group">
        <tr>
          {colonne.map((c) => (
            <th
              key={c}
              className="group relative border border-foreground/60 bg-muted px-1.5 py-1 text-left font-semibold"
            >
              <div className="flex items-center justify-between gap-1">
                <span>{INTESTAZIONI[c]}</span>
                {onRimuoviColonna && colonne.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRimuoviColonna(c)}
                    title={`Rimuovi colonna "${INTESTAZIONI[c]}"`}
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
        {righe.map((r) => (
          <tr key={r.id} className="odd:bg-muted/30" style={{ breakInside: "avoid" }}>
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
