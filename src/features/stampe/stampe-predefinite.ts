/*
 * File:      stampe-predefinite.ts
 * Percorso:  src/features/stampe/stampe-predefinite.ts
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Le 7 stampe predefinite: filtri già impostati, colonne di partenza, raggruppamento e spiegazione per le carte.
 *   rev 2 — 08/11/2026 14:40 — Aggiornata la stampa per-funzioni in «Stampa per gruppi di sicurezza» con supporto a Privacy e macro-gruppi.
 */
import { COLONNE_PREDEFINITE, FILTRI_INIZIALI, type Colonna, type FiltriStampa } from "./stampa-tipi";
import type { RaggruppaPer } from "./stampa-gruppi";

export type FamigliaPredefinita = "Anagrafica" | "Scadenze";

export type StampaPredefinita = {
  id: string;
  famiglia: FamigliaPredefinita;
  titolo: string;
  /** Spiegazione mostrata sulla carta: cosa fa questa stampa. */
  descrizione: string;
  /** Cosa compare nelle colonne di partenza (a parole, per la carta). */
  contiene: string;
  /** Filtri già applicati: nella pagina della stampa non sono modificabili. */
  filtri: FiltriStampa;
  /** Colonne di partenza (l'utente può toglierne, aggiungerne e ridimensionarle in anteprima). */
  colonne: Colonna[];
  /** Raggruppamento con salto pagina (solo elenco lavoratori). */
  raggruppaPer?: RaggruppaPer;
  /** Filtri applicati, in parole, per il sottotitolo del foglio e la striscia sopra l'anteprima. */
  filtriApplicati: string[];
  messaggioVuoto?: string;
};

const ANAGRAFICA: Colonna[] = ["lavoratore", "cf", "luogoNascita", "dataNascita", "reparto", "mansione", "assunzione"];
const COLONNE_SCADENZE: Colonna[] = [...COLONNE_PREDEFINITE.scadenze];
const CONTIENE_ANAGRAFICA = "Cognome e nome, codice fiscale, luogo e data di nascita, reparto, mansione, data di assunzione.";
const CONTIENE_SCADENZE = "Scadenza, stato, lavoratore, codice fiscale, reparto, corso, data del corso.";

const lavoratori: FiltriStampa = { ...FILTRI_INIZIALI, modello: "lavoratori" };
const scadenze: FiltriStampa = { ...FILTRI_INIZIALI, modello: "scadenze", finestra: "365" };
const scaduteOEntro12Mesi = "Scaduti e in scadenza entro 12 mesi";

export const STAMPE_PREDEFINITE: StampaPredefinita[] = [
  {
    id: "anagrafica-tutti",
    famiglia: "Anagrafica",
    titolo: "Anagrafica di tutti i lavoratori",
    descrizione: "L'elenco completo dei lavoratori in servizio con tutti i dati anagrafici, in ordine alfabetico.",
    contiene: CONTIENE_ANAGRAFICA,
    filtri: lavoratori,
    colonne: ANAGRAFICA,
    filtriApplicati: ["Lavoratori in servizio"],
  },
  {
    id: "anagrafica-reparti",
    famiglia: "Anagrafica",
    titolo: "Anagrafica per settori",
    descrizione: "Come l'anagrafica completa, ma divisa per reparto (Docente, ATA…): ogni reparto parte su una pagina nuova.",
    contiene: CONTIENE_ANAGRAFICA,
    filtri: lavoratori,
    colonne: ANAGRAFICA,
    raggruppaPer: "reparto",
    filtriApplicati: ["Lavoratori in servizio", "Divisi per reparto"],
  },
  {
    id: "per-funzioni",
    famiglia: "Anagrafica",
    titolo: "Stampa per gruppi di sicurezza",
    descrizione:
      "I lavoratori divisi per gruppo di sicurezza (preposti, antincendio, primo soccorso, defibrillatore, evacuazione, privacy…): ogni gruppo parte su una pagina nuova. Chi appartiene a più gruppi compare in ciascuno.",
    contiene: "Cognome e nome, codice fiscale, reparto, mansione, ruoli di sicurezza.",
    filtri: lavoratori,
    colonne: ["lavoratore", "cf", "reparto", "mansione", "ruoli"],
    raggruppaPer: "funzione",
    filtriApplicati: ["Solo lavoratori con un gruppo assegnato", "Divisi per gruppo"],
    messaggioVuoto: "Nessun lavoratore appartiene a un gruppo di sicurezza.",
  },
  {
    id: "scadenze-tutte",
    famiglia: "Scadenze",
    titolo: "Scadenze – tutte",
    descrizione: "Tutti gli attestati già scaduti o che scadono nei prossimi 12 mesi, dal più urgente.",
    contiene: CONTIENE_SCADENZE,
    filtri: scadenze,
    colonne: COLONNE_SCADENZE,
    filtriApplicati: [scaduteOEntro12Mesi, "Solo l'attestato più recente per lavoratore e corso"],
  },
  {
    id: "scadenze-preposti",
    famiglia: "Scadenze",
    titolo: "Scadenze – preposti",
    descrizione: "Le scadenze dei preposti con l'incarico oggi assegnato: scaduti e in scadenza entro 12 mesi.",
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenze, gruppo: "preposti", soloIncarichi: true },
    colonne: COLONNE_SCADENZE,
    filtriApplicati: [scaduteOEntro12Mesi, "Solo preposti con incarico assegnato"],
  },
  {
    id: "scadenze-antincendio",
    famiglia: "Scadenze",
    titolo: "Scadenze – antincendio",
    descrizione: "Le scadenze degli addetti antincendio con l'incarico oggi assegnato: scaduti e in scadenza entro 12 mesi.",
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenze, gruppo: "antincendio", soloIncarichi: true },
    colonne: COLONNE_SCADENZE,
    filtriApplicati: [scaduteOEntro12Mesi, "Solo addetti antincendio con incarico assegnato"],
  },
  {
    id: "scadenze-primo-soccorso",
    famiglia: "Scadenze",
    titolo: "Scadenze – primo soccorso",
    descrizione: "Le scadenze degli addetti al primo soccorso con l'incarico oggi assegnato: scaduti e in scadenza entro 12 mesi.",
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenze, gruppo: "primo-soccorso", soloIncarichi: true },
    colonne: COLONNE_SCADENZE,
    filtriApplicati: [scaduteOEntro12Mesi, "Solo addetti primo soccorso con incarico assegnato"],
  },
];

export function trovaPredefinita(id: string): StampaPredefinita | undefined {
  return STAMPE_PREDEFINITE.find((s) => s.id === id);
}
