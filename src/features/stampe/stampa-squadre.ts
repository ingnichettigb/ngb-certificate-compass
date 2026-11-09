/*
 * File:      stampa-squadre.ts
 * Percorso:  src/features/stampe/stampa-squadre.ts
 * Data creaz: 09/11/2026
 * Revisioni:
 *   rev 1 — 09/11/2026 20:00 — Regole dell'«Organigramma squadre di sicurezza»: per ogni lavoratore e squadra, stato di Corso base e
 *            Aggiornamento (valido / in scadenza / scaduto / fuori termine / da formare / non necessario) e testo delle celle.
 *
 * Regole (concordate):
 * - Con un Aggiornamento fatto «in tempo» conta quello: lo stato si legge dall'aggiornamento (il Corso base mostra solo la data).
 * - «In tempo» = fatto entro il 31/12 dell'anno in cui scadeva l'attestato precedente (tolleranza anno solare).
 * - Un aggiornamento fatto dopo il termine non conta: «Fuori termine», e il Corso base mostra il suo stato.
 * - Senza aggiornamento: il Corso base ancora lontano dalla scadenza (oltre 90 giorni) → Aggiornamento «Non necessario»;
 *   altrimenti, o se non c'è il Corso base, → «Da formare».
 * Funzioni pure, senza dipendenze dall'interfaccia.
 */
import type { Attestato } from "@/lib/api";
import { dataIt } from "./stampa-formati";
import type { CellaSquadra, Colonna, EsitoSquadra, RigaStampa } from "./stampa-tipi";

/** Le quattro squadre dell'organigramma, nell'ordine di stampa (lo stesso di ORDINE_MACRO_GRUPPI). */
export const SQUADRE = [
  { chiave: "antincendio", nome: "Antincendio" },
  { chiave: "primo-soccorso", nome: "Primo soccorso" },
  { chiave: "defibrillatore", nome: "Defibrillatore" },
  { chiave: "privacy", nome: "Privacy" },
] as const;

/** Giorni prima della scadenza da cui il corso risulta «In scadenza» (come in tutta l'applicazione). */
export const GIORNI_PREAVVISO = 90;

/** Codici degli aggiornamenti, usati se nel catalogo il livello del corso non è indicato. */
const CODICI_AGGIORNAMENTO = new Set([
  "VFF-FOR1A2", "VFF-FOR2A5", "VFF-FOR3A8",
  "PSO-AGB-04", "PSO-AGA-04", "PSO-GAA-06",
  "BLS-AGG-02", "PRIVACY-A01", "PRIVACY-A02",
]);

/** Aggiornamento (o retraining) oppure corso base. */
export function eAggiornamento(tc: { codice?: string | null; livello_specifico?: string | null } | null | undefined): boolean {
  const livello = (tc?.livello_specifico ?? "").toLowerCase();
  if (livello.includes("aggiorn") || livello.includes("retrain")) return true;
  if (livello.includes("base") || livello.includes("specific")) return false;
  return CODICI_AGGIORNAMENTO.has((tc?.codice ?? "").toUpperCase());
}

/* ------------------------------------------------------------------------------------------------
 * Date (stringhe AAAA-MM-GG, senza fusi orari)
 * ---------------------------------------------------------------------------------------------- */

const fineAnno = (d: string) => `${d.slice(0, 4)}-12-31`;

function menoGiorni(d: string, giorni: number): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - giorni);
  return t.toISOString().slice(0, 10);
}

function piuAnni(d: string, anni: number): string {
  const [y, m, g] = d.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y + anni, m - 1, g));
  if (t.getUTCMonth() !== m - 1) t.setUTCDate(0); // 29 febbraio → 28 febbraio
  return t.toISOString().slice(0, 10);
}

/** Scadenza dell'attestato: quella calcolata, altrimenti data corso + durata del tipo di corso; null = non scade. */
function scadenzaDi(a: Attestato): string | null {
  if (a.data_scadenza_calcolata) return a.data_scadenza_calcolata.slice(0, 10);
  const anni = a.tipi_corso?.durata_validita_anni;
  return anni ? piuAnni(a.data_corso.slice(0, 10), anni) : null;
}

/** Stato alla data di oggi: scaduto solo dopo il 31/12 dell'anno di scadenza (tolleranza), in scadenza da 90 giorni prima. */
export function esitoPerScadenza(scadenza: string | null, oggi: string): "valido" | "in_scadenza" | "scaduto" {
  if (!scadenza) return "valido";
  if (oggi > fineAnno(scadenza)) return "scaduto";
  if (oggi >= menoGiorni(scadenza, GIORNI_PREAVVISO)) return "in_scadenza";
  return "valido";
}

/* ------------------------------------------------------------------------------------------------
 * Calcolo delle due celle di una squadra
 * ---------------------------------------------------------------------------------------------- */

type Anello = { data: string; scadenza: string | null; agg: boolean; inTempo: boolean };

/** Celle «Corso base» e «Aggiornamento» di un lavoratore per una squadra; «attestati» = i suoi attestati approvati di quella squadra. */
export function celleSquadra(attestati: Attestato[], oggi: string): { base: CellaSquadra; aggiornamento: CellaSquadra } {
  const catena: Anello[] = [...attestati]
    .sort((a, b) => a.data_corso.localeCompare(b.data_corso))
    .map((a) => ({ data: a.data_corso.slice(0, 10), scadenza: scadenzaDi(a), agg: eAggiornamento(a.tipi_corso), inTempo: true }));

  // Un aggiornamento è «in tempo» se fatto entro il 31/12 dell'anno di scadenza dell'attestato che lo precede.
  catena.forEach((c, i) => {
    const prima = catena[i - 1];
    if (c.agg && prima?.scadenza) c.inTempo = c.data <= fineAnno(prima.scadenza);
  });

  const base = [...catena].reverse().find((c) => !c.agg);
  const aggiornamenti = catena.filter((c) => c.agg && (!base || c.data >= base.data));
  const ultimoAgg = aggiornamenti[aggiornamenti.length - 1];
  const aggEfficace = ultimoAgg?.inTempo ? ultimoAgg : undefined;

  const cellaBase: CellaSquadra = !base
    ? { data: null, etichetta: "da_formare" }
    : aggEfficace
      ? { data: base.data, etichetta: "valido" }
      : { data: base.data, etichetta: esitoPerScadenza(base.scadenza, oggi) };

  let cellaAgg: CellaSquadra;
  if (ultimoAgg) {
    cellaAgg = aggEfficace
      ? { data: ultimoAgg.data, etichetta: esitoPerScadenza(ultimoAgg.scadenza, oggi) }
      : { data: ultimoAgg.data, etichetta: "fuori_termine" };
  } else if (base && esitoPerScadenza(base.scadenza, oggi) === "valido") {
    cellaAgg = { data: null, etichetta: "non_necessario" };
  } else {
    cellaAgg = { data: null, etichetta: "da_formare" };
  }
  return { base: cellaBase, aggiornamento: cellaAgg };
}

/* ------------------------------------------------------------------------------------------------
 * Testo delle celle (anteprima, PDF, Excel, CSV)
 * ---------------------------------------------------------------------------------------------- */

const AVVISO: Partial<Record<EsitoSquadra, string>> = {
  in_scadenza: "In scadenza",
  scaduto: "Scaduto",
  fuori_termine: "Fuori termine",
};

/** Testo su una riga: «15/05/2020 (Scaduto)», «Da formare», «Non necessario». */
export function testoCellaSquadra(c: CellaSquadra | undefined): string {
  if (!c) return "—";
  if (c.etichetta === "da_formare") return "Da formare";
  if (c.etichetta === "non_necessario") return "Non necessario";
  const avviso = AVVISO[c.etichetta];
  return avviso ? `${dataIt(c.data)} (${avviso})` : dataIt(c.data);
}

/** Righe visive della cella: la data sopra e sotto l'avviso colorato (rosso: scaduto, fuori termine, da formare; arancione: in scadenza). */
export function righeCellaSquadra(r: RigaStampa, colonna: Colonna): { testo: string; colore?: "rosso" | "arancione"; grassetto?: boolean }[] | null {
  if (colonna !== "corsoBaseSquadra" && colonna !== "aggiornamentoSquadra") return null;
  const c = colonna === "corsoBaseSquadra" ? r.cellaBase : r.cellaAggiornamento;
  if (!c) return [{ testo: "—" }];
  switch (c.etichetta) {
    case "da_formare": return [{ testo: "Da formare", colore: "rosso", grassetto: true }];
    case "non_necessario": return [{ testo: "Non necessario" }];
    case "valido": return [{ testo: dataIt(c.data) }];
    case "in_scadenza": return [{ testo: dataIt(c.data) }, { testo: "In scadenza", colore: "arancione", grassetto: true }];
    case "scaduto": return [{ testo: dataIt(c.data) }, { testo: "Scaduto", colore: "rosso", grassetto: true }];
    case "fuori_termine": return [{ testo: dataIt(c.data) }, { testo: "Fuori termine", colore: "rosso", grassetto: true }];
  }
}

/** Legenda sotto la tabella (anteprima e PDF). */
export const LEGENDA_SQUADRE =
  "Legenda squadre: sotto la data «In scadenza» (arancione) = scade entro 90 giorni; «Scaduto» (rosso) = termine superato; «Fuori termine» (rosso) = aggiornamento fatto dopo il 31/12 dell'anno di scadenza; «Non necessario» = aggiornamento non ancora dovuto; «Da formare» (rosso) = non svolto. Con un aggiornamento in tempo (entro il 31/12 dell'anno di scadenza) lo stato si legge dall'aggiornamento.";
