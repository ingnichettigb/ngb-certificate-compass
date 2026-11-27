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
 *   rev 5 — 27/11/2026 — «Senza PDF» riguarda solo i lavoratori in forza: almeno un attestato registrato senza file oppure nessun
 *                              attestato. Regola unica (lavoratoriSenzaPdf) usata dal filtro e dal contatore della Home;
 *                              aggiunti contaPdfMancanti e parseFiltroStato (filtro iniziale da indirizzo).
 */
import { type Dipendente, type Attestato } from "@/lib/api";
import { statoRegistrato } from "@/lib/api/attestati";
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

const FILTRI_STATO: readonly FiltroStato[] = [
  "in_forza",
  "nuovi_arrivati",
  "da_completare",
  "in_scadenza",
  "cessati",
  "senza_pdf",
  "tutti",
];

/** Filtro stato letto da un valore esterno (es. indirizzo della pagina): undefined se non valido. */
export function parseFiltroStato(valore: unknown): FiltroStato | undefined {
  return typeof valore === "string" && (FILTRI_STATO as readonly string[]).includes(valore)
    ? (valore as FiltroStato)
    : undefined;
}

export type AttestatoPerPdf = Pick<Attestato, "dipendente_id" | "url_foto_fronte" | "stato_validazione">;

/** Attestato registrato (approvato o «File Attestato mancante») senza il file collegato. */
function eSenzaFile(a: Pick<Attestato, "url_foto_fronte" | "stato_validazione">): boolean {
  return statoRegistrato(a.stato_validazione) && !a.url_foto_fronte?.trim();
}

/** Quanti attestati registrati di un lavoratore non hanno ancora il file PDF. */
export function contaPdfMancanti(attestatiLavoratore: Pick<Attestato, "url_foto_fronte" | "stato_validazione">[]): number {
  return attestatiLavoratore.filter(eSenzaFile).length;
}

/**
 * Lavoratori «Senza PDF»: solo quelli in forza, con almeno un attestato registrato senza file
 * oppure con nessun attestato. Gli attestati «In attesa» o «Respinto» restano alla validazione HR.
 */
export function lavoratoriSenzaPdf<T extends Pick<Dipendente, "id" | "stato_lavoratore">>(
  lista: T[],
  attestati: AttestatoPerPdf[],
): T[] {
  const conAttestati = new Set<string>();
  const conPdfMancante = new Set<string>();
  for (const a of attestati) {
    conAttestati.add(a.dipendente_id);
    if (eSenzaFile(a)) conPdfMancante.add(a.dipendente_id);
  }
  return lista.filter((d) => !isCessato(d) && (conPdfMancante.has(d.id) || !conAttestati.has(d.id)));
}

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
  attestati: AttestatoPerPdf[] = [],
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
    case "senza_pdf":
      return lavoratoriSenzaPdf(lista, attestati);
    default:
      return lista;
  }
}
