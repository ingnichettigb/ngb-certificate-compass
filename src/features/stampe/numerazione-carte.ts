/*
 * File:      numerazione-carte.ts
 * Percorso:  src/features/stampe/numerazione-carte.ts
 * Data creaz: 10/11/2026
 * Revisioni:
 *   rev 1 — 10/11/2026 18:00 — Elenco ordinato delle carte della pagina «Stampe predefinite» e loro numero progressivo (01, 02, …).
 *            La tavola grafica «Organigramma della sicurezza – A3» è ora una carta a tutti gli effetti (la 01 di «Anagrafica e organico»);
 *            le altre carte scalano senza buchi: Scadenze parte dalla 06, Completati segue.
 *   rev 2 — 11/11/2026 17:30 — Nuova carta 04 «Registro lavoratori cessati»: la numerazione resta automatica (posizione nell'elenco), le carte
 *            successive scalano di uno: Scadenze parte dalla 07, Completati dalla 14.
 *   rev 3 — 22/11/2026 — Nuova carta 13 «Scadenze – defibrillatore (DAE / BLSD)»: numerazione sempre automatica; Scadenze – privacy diventa la 14, Completati dalla 15.
 *   rev 4 — 23/11/2026 — Nuova carta «Stampa selezione» (sezione «Fascicolo completo»): ha il numero progressivo dopo l'ultima carta di tabella
 *            (oggi la 21), così i numeri 01–20 delle altre carte non cambiano. Non è in `tutteLeCarte()` perché apre una pagina di scelta,
 *            non un'anteprima di tabella; il numero lo dà `numeriCarte()`.
 */
import { STAMPE_PREDEFINITE, type FamigliaPredefinita } from "./stampe-predefinite";

export const FAMIGLIE: { nome: FamigliaPredefinita; titolo: string }[] = [
  { nome: "Anagrafica", titolo: "Anagrafica e organico" },
  { nome: "Scadenze", titolo: "Scadenze degli attestati" },
  { nome: "Completati", titolo: "Formazione completata e abilitazioni" },
];

/** Una carta dell'elenco: o una stampa predefinita (tabella) o la tavola grafica A3. */
export type VoceCarta = {
  id: string;
  famiglia: FamigliaPredefinita;
  titolo: string;
  descrizione: string;
  contiene: string;
  /** true = apre la tavola A3 (rotta /stampe/organigramma-a3) invece dell'anteprima tabellare. */
  tavolaA3?: boolean;
};

export const ID_TAVOLA_A3 = "organigramma-a3";
/** Carta «Stampa selezione»: numerata come le altre, ma sta nella sezione «Fascicolo completo». */
export const ID_STAMPA_SELEZIONE = "stampa-selezione";

export const CARTA_TAVOLA_A3: VoceCarta = {
  id: ID_TAVOLA_A3,
  famiglia: "Anagrafica",
  titolo: "Organigramma della sicurezza – Tavola grafica A3",
  descrizione:
    "Tavola grafica A3 orizzontale su un unico foglio: figure di vertice, preposti, squadre, voci aggiuntive e firme.",
  contiene:
    "Datore di lavoro, RLS, Medico competente, RSPP/ASPP, preposti, squadre (primo soccorso, antincendio, DAE, evacuazione, privacy), voci libere, firme.",
  tavolaA3: true,
};

/** Carte di una famiglia nell'ordine di visualizzazione: la tavola A3 è la prima di «Anagrafica». */
export function carteDellaFamiglia(nome: FamigliaPredefinita): VoceCarta[] {
  const tabelle = STAMPE_PREDEFINITE.filter((s) => s.famiglia === nome);
  return nome === "Anagrafica" ? [CARTA_TAVOLA_A3, ...tabelle] : tabelle;
}

/** Tutte le carte nell'ordine in cui compaiono in pagina (famiglia per famiglia). */
export function tutteLeCarte(): VoceCarta[] {
  return FAMIGLIE.flatMap((f) => carteDellaFamiglia(f.nome));
}

/** Numero progressivo a due cifre per id carta, senza buchi. L'ultimo numero è quello di «Stampa selezione». */
export function numeriCarte(): Record<string, string> {
  const carte = tutteLeCarte();
  const numeri = Object.fromEntries(carte.map((c, i) => [c.id, String(i + 1).padStart(2, "0")]));
  numeri[ID_STAMPA_SELEZIONE] = String(carte.length + 1).padStart(2, "0");
  return numeri;
}
