/*
 * File:      stampa-stile.ts
 * Percorso:  src/features/stampe/stampa-stile.ts
 * Data creaz: 09/11/2026
 * Revisioni:
 *   rev 1 — 09/11/2026 20:00 — Un solo punto che decide testo, colore e grassetto di ogni cella: lo usano sia l'anteprima (TabellaStampa)
 *            sia il PDF (esporta-pdf), così i colori a video e nel PDF non possono più divergere.
 *   rev 2 — 09/11/2026 21:55 — «In scadenza» in arancione (e grassetto) anche nelle tabelle normali, come l'avviso dell'Organigramma squadre:
 *            tutte le stampe usano ora la stessa scala di colori (rosso = scaduto / manca / dato mancante, arancione = in scadenza).
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
  const arancione = c === "stato" && r.stato === "in_scadenza";
  const grassetto = rosso || arancione || attestatoSenzaRuolo(r, c);
  const colore = rosso ? { colore: "rosso" as const } : arancione ? { colore: "arancione" as const } : {};
  return [{ testo: cella(r, c), ...colore, ...(grassetto ? { grassetto: true } : {}) }];
}
