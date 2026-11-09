/*
 * File:      stampa-ordine.ts
 * Percorso:  src/features/stampe/stampa-ordine.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da dati-stampa.ts: ordinamento per colonna e «Univoco». Nessun cambio di comportamento.
 *   rev 2 — 08/11/2026 — Ordinamento per la nuova colonna «Data di nascita».
 */
import type { Colonna, RigaStampa, StatoValidita } from "./stampa-tipi";
import { cella, testoMancanti } from "./stampa-testo";

/* ------------------------------------------------------------------------------------------------
 * Ordinamento per colonna e «Univoco»
 * ---------------------------------------------------------------------------------------------- */

export type DirezioneOrdine = "asc" | "desc";
export type OrdineColonna = { colonna: Colonna; direzione: DirezioneOrdine };

const CONFRONTO = new Intl.Collator("it", { numeric: true, sensitivity: "base" });
const PESO_STATO: Record<StatoValidita, number> = { manca: -1, scaduto: 0, in_scadenza: 1, valido: 2, senza_scadenza: 3 };

/** Valore con cui si ordina una colonna; null = dato assente (finisce sempre in fondo). */
function chiaveOrdine(r: RigaStampa, c: Colonna): string | number | null {
  switch (c) {
    case "lavoratore": return `${r.cognome} ${r.nome}`.trim() || null;
    case "scadenza": return r.scadenza;
    case "data": return r.dataCorso || null;
    case "assunzione": return r.assunzione;
    case "fineContratto": return r.fineContratto;
    case "cessazione": return r.cessazione;
    case "nascita":
    case "dataNascita": return r.dataNascita;
    case "ore": return r.ore;
    case "giorni": return r.giorniAllaScadenza;
    case "stato": return PESO_STATO[r.stato];
    case "mancano": return r.mancanti.length ? testoMancanti(r) : null;
    default: {
      const t = cella(r, c);
      return t && t !== "—" ? t : null;
    }
  }
}

function confrontaChiavi(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return CONFRONTO.compare(String(a), String(b));
}

/** Copia ordinata per la colonna scelta (stabile; i dati assenti restano in fondo in entrambe le direzioni). */
export function ordinaRighe(righe: RigaStampa[], ordine: OrdineColonna | null): RigaStampa[] {
  if (!ordine) return righe;
  const segno = ordine.direzione === "asc" ? 1 : -1;
  return righe
    .map((r, i) => ({ r, i, k: chiaveOrdine(r, ordine.colonna) }))
    .sort((x, y) => {
      if (x.k === null && y.k === null) return x.i - y.i;
      if (x.k === null) return 1;
      if (y.k === null) return -1;
      return segno * confrontaChiavi(x.k, y.k) || x.i - y.i;
    })
    .map((x) => x.r);
}

/** Giro dell'ordinamento a ogni clic sulla stessa intestazione: A→Z, poi Z→A, poi nessuno. */
export function prossimoOrdine(attuale: OrdineColonna | null, colonna: Colonna): OrdineColonna | null {
  if (!attuale || attuale.colonna !== colonna) return { colonna, direzione: "asc" };
  return attuale.direzione === "asc" ? { colonna, direzione: "desc" } : null;
}

/** Una sola riga per lavoratore: quella con la scadenza più urgente (la più vecchia; senza scadenza per ultima). */
export function unicoPerLavoratore(righe: RigaStampa[]): RigaStampa[] {
  const migliori = new Map<string, RigaStampa>();
  for (const r of righe) {
    const gia = migliori.get(r.dipendenteId);
    if (!gia) { migliori.set(r.dipendenteId, r); continue; }
    const nuova = r.scadenza ?? "9999-99-99";
    const vecchia = gia.scadenza ?? "9999-99-99";
    if (nuova < vecchia) migliori.set(r.dipendenteId, r);
  }
  // Mantiene l'ordine originale delle righe scelte.
  const scelte = new Set(migliori.values());
  return righe.filter((r) => scelte.has(r));
}
