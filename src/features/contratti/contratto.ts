/*
 * File:      contratto.ts
 * Percorso:  src/features/contratti/contratto.ts
 * Data creaz: 28/10/2026
 * Revisioni:
 *   rev 1 — 28/10/2026 09:40 — Regole pure della gestione contrattuale (avviso scadenza, filtro stato).
 *   rev 2 — 28/10/2026 10:55 — Filtro «senza_pdf»: lavoratori con almeno un attestato senza file.
 *   rev 3 — 28/10/2026 17:40 — Filtro «nuovi_arrivati»: assunti negli ultimi 60 giorni.
 *   rev 4 — 05/11/2026 21:30 — «Nuovi arrivati» = assunti dal 1 settembre dell'anno scolastico in corso (non più 60 giorni);
 *                              nuovo filtro «da_completare» (importati o riabilitati ancora da completare).
 */
import { type Dipendente, type Attestato } from "@/lib/api";
import { eNuovoDellAnno, inCodaDaCompletare } from "@/features/da-completare/regola-coda";

export const GIORNI_AVVISO = 30;

export type FiltroStato =
  | "in_forza"
  | "nuovi_arrivati"
  | "da_completare"
  | "in_scadenza"
  | "cessati"
  | "senza_pdf"
  | "tutti";

export function isCessato(d: Pick<Dipendente, "stato_lavoratore">) {
  return d.stato_lavoratore === "cessato";
}

export function isNuovoArrivato(d: Dipendente, oggi = new Date()): boolean {
  return !isCessato(d) && eNuovoDellAnno(d, oggi);
}

export function giorniAllaFine(d: Dipendente, oggi = new Date()): number | null {
  if (isCessato(d) || d.tipo_contratto !== "determinato" || !d.data_fine_contratto) return null;
  const fine = new Date(d.data_fine_contratto + "T00:00:00");
  const base = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  return Math.round((fine.getTime() - base.getTime()) / 86_400_000);
}

export function richiedeDecisione(d: Dipendente, oggi = new Date()) {
  const g = giorniAllaFine(d, oggi);
  return g !== null && g <= GIORNI_AVVISO;
}

export function filtraPerStato(
  lista: Dipendente[],
  filtro: FiltroStato,
  oggi = new Date(),
  attestati: Pick<Attestato, "dipendente_id" | "url_foto_fronte">[] = [],
) {
  switch (filtro) {
    case "in_forza":
      return lista.filter((d) => !isCessato(d));
    case "nuovi_arrivati":
      return lista.filter((d) => isNuovoArrivato(d, oggi));
    case "da_completare":
      return lista.filter((d) => inCodaDaCompletare(d, oggi));
    case "in_scadenza":
      return lista.filter((d) => richiedeDecisione(d, oggi));
    case "cessati":
      return lista.filter(isCessato);
    case "senza_pdf": {
      const ids = new Set(
        attestati.filter((a) => !a.url_foto_fronte?.trim()).map((a) => a.dipendente_id),
      );
      return lista.filter((d) => ids.has(d.id));
    }
    default:
      return lista;
  }
}
