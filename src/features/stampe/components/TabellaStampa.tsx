/*
 * File:      TabellaStampa.tsx
 * Percorso:  src/features/stampe/components/TabellaStampa.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Tabella righe attestati per i modelli di stampa.
 */
import { dataIt, ETICHETTA_STATO, type RigaStampa } from "../dati-stampa";

type Colonna = "lavoratore" | "cf" | "reparto" | "corso" | "ore" | "numero" | "data" | "scadenza" | "stato";

const INTESTAZIONI: Record<Colonna, string> = {
  lavoratore: "Lavoratore", cf: "Codice fiscale", reparto: "Reparto", corso: "Corso", ore: "Ore",
  numero: "N. attestato", data: "Data corso", scadenza: "Scadenza", stato: "Stato",
};

function cella(r: RigaStampa, c: Colonna): string {
  switch (c) {
    case "lavoratore": return `${r.cognome} ${r.nome}`;
    case "cf": return r.cf;
    case "reparto": return r.reparto;
    case "corso": return r.codice ? `${r.codice} – ${r.corso}` : r.corso;
    case "ore": return r.ore != null ? String(r.ore) : "—";
    case "numero": return r.numero || "—";
    case "data": return dataIt(r.dataCorso);
    case "scadenza": return dataIt(r.scadenza);
    case "stato": return ETICHETTA_STATO[r.stato];
  }
}

export function TabellaStampa({ righe, colonne }: { righe: RigaStampa[]; colonne: Colonna[] }) {
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead className="table-header-group">
        <tr>
          {colonne.map((c) => (
            <th key={c} className="border border-foreground/60 bg-muted px-1.5 py-1 text-left font-semibold">{INTESTAZIONI[c]}</th>
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

export type { Colonna };
