/*
 * File:      stampa-colonne.ts
 * Percorso:  src/features/stampe/stampa-colonne.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da dati-stampa.ts: colonne aggiungibili dall'intestazione. Nessun cambio di comportamento.
 *   rev 2 — 08/11/2026 — Aggiunte tra le colonne dell'anagrafica «Luogo di nascita» e «Data di nascita».
 *   rev 3 — 09/11/2026 17:30 — Colonna «inSquadra» aggiunta al gruppo «Formazione e incarichi» per i documenti per attestato.
 *   rev 4 — 09/11/2026 20:00 — Gruppo «Squadre di sicurezza» (Squadra, Corso base, Aggiornamento): solo per l'Organigramma.
 */
import type { Attestato } from "@/lib/api";
import type { Colonna, Modello } from "./stampa-tipi";
import { INTESTAZIONI } from "./stampa-testo";

/* ------------------------------------------------------------------------------------------------
 * Colonne aggiungibili dal «+» dell'intestazione
 * ---------------------------------------------------------------------------------------------- */

export type GruppoColonne = { titolo: string; colonne: Colonna[] };

/** Raggruppamento funzionale di tutte le colonne esistenti. L'ordine qui è indifferente: gruppiColonne() ordina per nome. */
const RAGGRUPPAMENTO_COLONNE: GruppoColonne[] = [
  { titolo: "Anagrafica", colonne: ["lavoratore", "cf", "reparto", "categoria", "mansione", "nascita", "luogoNascita", "dataNascita"] },
  { titolo: "Attestato", colonne: ["corso", "argomento", "numero", "ore", "data", "scadenza", "giorni", "stato", "inSquadra"] },
  { titolo: "Contratto", colonne: ["assunzione", "fineContratto", "cessazione"] },
  { titolo: "Controllo dati", colonne: ["mancano"] },
  { titolo: "Squadre di sicurezza", colonne: ["squadra", "corsoBaseSquadra", "aggiornamentoSquadra"] },
  { titolo: "Formazione e incarichi", colonne: ["corsoBase", "corsoSpecifico", "preposto", "antincendio", "primoSoccorso", "defibrillatore", "ruoli"] },
];

/** Colonne con dato solo nelle righe «per attestato» (nell'elenco lavoratori sarebbero vuote). */
const SOLO_PER_ATTESTATO: readonly Colonna[] = ["corso", "argomento", "numero", "ore", "data", "scadenza", "giorni", "stato", "inSquadra"];
/** Colonne con dato solo nelle righe «per lavoratore» (nelle righe per attestato non sono valorizzate). */
const SOLO_PER_LAVORATORE: readonly Colonna[] = [
  "assunzione", "ruoli", "corsoBase", "corsoSpecifico", "preposto", "antincendio", "primoSoccorso", "defibrillatore",
];

/** Colonne con dato solo nell'Organigramma delle squadre. */
const SOLO_ORGANIGRAMMA: readonly Colonna[] = ["squadra", "corsoBaseSquadra", "aggiornamentoSquadra"];

const ORDINE_ALFABETICO = new Intl.Collator("it", { sensitivity: "base" });

/** Colonne che hanno un dato reale nel documento scelto. */
export function colonneDisponibili(modello: Modello, organigramma = false): Colonna[] {
  const perLavoratore = modello === "lavoratori";
  return RAGGRUPPAMENTO_COLONNE.flatMap((g) => g.colonne)
    .filter((c) => organigramma || !SOLO_ORGANIGRAMMA.includes(c))
    .filter((c) => (perLavoratore ? !SOLO_PER_ATTESTATO.includes(c) : !SOLO_PER_LAVORATORE.includes(c)));
}

/** Elenco per il «+»: gruppi in ordine alfabetico e, dentro ogni gruppo, colonne in ordine alfabetico; i gruppi vuoti non compaiono. */
export function gruppiColonne(modello: Modello, organigramma = false): GruppoColonne[] {
  const disponibili = new Set(colonneDisponibili(modello, organigramma));
  return RAGGRUPPAMENTO_COLONNE
    .map((g) => ({
      titolo: g.titolo,
      colonne: g.colonne
        .filter((c) => disponibili.has(c))
        .sort((a, b) => ORDINE_ALFABETICO.compare(INTESTAZIONI[a], INTESTAZIONI[b])),
    }))
    .filter((g) => g.colonne.length > 0)
    .sort((a, b) => ORDINE_ALFABETICO.compare(a.titolo, b.titolo));
}
