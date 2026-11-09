/*
 * File:      stampa-stile.ts
 * Percorso:  src/features/stampe/stampa-stile.ts
 * Data creaz: 09/11/2026
 * Revisioni:
 *   rev 1 — 09/11/2026 20:00 — Un solo punto che decide testo, colore e grassetto di ogni cella: lo usano sia l'anteprima (TabellaStampa)
 *            sia il PDF (esporta-pdf), così i colori a video e nel PDF non possono più divergere.
 */
import type { Colonna, RigaStampa } from "./stampa-tipi";
import { attestatoSenzaRuolo, cella } from "./stampa-testo";
import { cellaMancante } from "./stampa-vista";
import { righeCellaSquadra } from "./stampa-squadre";

export type Colore = "rosso" | "arancione";
export type RigaVisuale = { testo: string; colore?: Colore; grassetto?: boolean };

/** Una o più righe di testo della cella, ciascuna con il proprio colore e grassetto. */
export function righeCella(r: RigaStampa, c: Colonna): RigaVisuale[] {
  const squadra = righeCellaSquadra(r, c);
  if (squadra) return squadra;
  const rosso =
    (c === "stato" && (r.stato === "scaduto" || r.stato === "manca")) ||
    (c === "scadenza" && r.stato === "manca") ||
    c === "mancano" ||
    cellaMancante(r, c);
  const grassetto = rosso || (c === "stato" && r.stato === "in_scadenza") || attestatoSenzaRuolo(r, c);
  return [{ testo: cella(r, c), ...(rosso ? { colore: "rosso" as const } : {}), ...(grassetto ? { grassetto: true } : {}) }];
}
